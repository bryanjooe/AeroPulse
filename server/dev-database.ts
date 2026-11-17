import type { PoolClient } from 'pg';
import { pool, withTransaction } from './db.ts';
import { toSafeJson } from './data.ts';

const hiddenColumns=new Set(['passport_number']);
const quote=(identifier:string)=>`"${identifier.replaceAll('"','""')}"`;
type Obj={name:string;type:'table'|'view';description:string|null;estimated_rows:number};
type Col={name:string;data_type:string;nullable:boolean;default_value:string|null;description:string|null;ordinal_position:number};

export async function getObjects():Promise<Obj[]> {
  const result=await pool.query(`SELECT c.relname AS name,CASE WHEN c.relkind IN ('v','m') THEN 'view' ELSE 'table' END AS type,
    obj_description(c.oid,'pg_class') AS description,GREATEST(c.reltuples::bigint,0) AS estimated_rows
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND c.relname NOT LIKE 'pg_%'
    ORDER BY CASE WHEN c.relkind IN ('v','m') THEN 1 ELSE 0 END,c.relname`);
  return result.rows.map(row=>({...row,estimated_rows:Number(row.estimated_rows)}));
}

async function authorizedObject(client:PoolClient,name:string){
  const result=await client.query(`SELECT c.oid,c.relname AS name,CASE WHEN c.relkind IN ('v','m') THEN 'view' ELSE 'table' END AS type,
    obj_description(c.oid,'pg_class') AS description FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=$1 AND c.relkind IN ('r','p','v','m') AND c.relname NOT LIKE 'pg_%'`,[name]);
  return result.rows[0] as {oid:number;name:string;type:'table'|'view';description:string|null}|undefined;
}

async function columns(client:PoolClient,oid:number):Promise<Col[]> {
  const result=await client.query(`SELECT a.attname AS name,format_type(a.atttypid,a.atttypmod) AS data_type,
    NOT a.attnotnull AS nullable,pg_get_expr(d.adbin,d.adrelid) AS default_value,col_description(a.attrelid,a.attnum) AS description,a.attnum AS ordinal_position
    FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE a.attrelid=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`,[oid]);
  return result.rows;
}

async function keyInfo(client:PoolClient,oid:number){
  const result=await client.query(`SELECT con.contype,con.conname,(SELECT json_agg(att.attname ORDER BY k.n) FROM unnest(con.conkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute att ON att.attrelid=con.conrelid AND att.attnum=k.attnum) AS columns,
    CASE WHEN con.contype='f' THEN rn.nspname||'.'||rc.relname||'('||ARRAY(SELECT att.attname FROM unnest(con.confkey) WITH ORDINALITY k(attnum,n) JOIN pg_attribute att ON att.attrelid=con.confrelid AND att.attnum=k.attnum ORDER BY k.n)::text||')' END AS target
    FROM pg_constraint con LEFT JOIN pg_class rc ON rc.oid=con.confrelid LEFT JOIN pg_namespace rn ON rn.oid=rc.relnamespace
    WHERE con.conrelid=$1 AND con.contype IN ('p','f','u') ORDER BY con.conname`,[oid]);
  return result.rows as {contype:string;conname:string;columns:string[];target:string|null}[];
}

export async function getObjectDetails(name:string){
  return withTransaction(async client=>{
    await client.query('SET TRANSACTION READ ONLY');
    const obj=await authorizedObject(client,name);if(!obj)return null;
    const [cols,keys,indexes,count]=await Promise.all([
      columns(client,obj.oid),keyInfo(client,obj.oid),client.query('SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=$1 AND tablename=$2 ORDER BY indexname',['public',name]),
      client.query(`SELECT count(*)::bigint AS count FROM public.${quote(name)}`),
    ]);
    const columnInfo=cols.map(col=>{const linked=keys.filter(k=>k.columns.includes(col.name));return {...col,primary_key:linked.some(k=>k.contype==='p'),foreign_keys:linked.filter(k=>k.contype==='f').map(k=>({name:k.conname,target:k.target})),unique:linked.some(k=>k.contype==='u'),sensitive:hiddenColumns.has(col.name)}});
    return {object:{...obj,row_count:count.rows[0].count},columns:columnInfo,indexes:indexes.rows.map(i=>({name:i.indexname,definition:i.indexdef}))};
  });
}

export async function getObjectRows(name:string,options:{page:number;limit:number;search:string;sort?:string;direction:'asc'|'desc'}){
  return withTransaction(async client=>{
    await client.query('SET TRANSACTION READ ONLY');await client.query("SET LOCAL statement_timeout='5s'");
    const obj=await authorizedObject(client,name);if(!obj)return null;
    const cols=await columns(client,obj.oid);const searchable=cols.filter(c=>/text|character|citext|date|timestamp/i.test(c.data_type)&&!hiddenColumns.has(c.name));
    const values:unknown[]=[];let where='';
    if(options.search){values.push(`%${options.search}%`);const p=`$${values.length}`;where=' WHERE '+(searchable.length?searchable.map(c=>`${quote(c.name)}::text ILIKE ${p}`).join(' OR '):'FALSE');}
    const sortCol=options.sort&&cols.some(c=>c.name===options.sort)?options.sort:cols[0]?.name;
    if(!sortCol)return {rows:[],total:0,page:options.page,limit:options.limit,columns:cols};
    const count=await client.query(`SELECT count(*)::bigint AS total FROM public.${quote(name)}${where}`,values);
    const offset=(options.page-1)*options.limit;const dir=options.direction==='desc'?'DESC':'ASC';
    const rows=await client.query(`SELECT * FROM public.${quote(name)}${where} ORDER BY ${quote(sortCol)} ${dir} NULLS LAST LIMIT $${values.length+1} OFFSET $${values.length+2}`,[...values,options.limit,offset]);
    const safeRows=rows.rows.map(row=>{const copy={...row};for(const key of hiddenColumns)if(key in copy)copy[key]=copy[key]==null?null:'••••••';return toSafeJson(copy)});
    return {rows:safeRows,total:Number(count.rows[0].total),page:options.page,limit:options.limit,columns:cols.map(c=>({...c,sensitive:hiddenColumns.has(c.name)})),masked_columns:[...hiddenColumns].filter(c=>cols.some(col=>col.name===c))};
  });
}
