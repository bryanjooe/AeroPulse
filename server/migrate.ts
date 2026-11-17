import { readdir,readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool,closePool } from './db.ts';

const directory=fileURLToPath(new URL('./migrations/',import.meta.url));
const files=(await readdir(directory)).filter(f=>/^\d+_[a-z0-9_-]+\.sql$/.test(f)).sort();
try{
  await pool.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations(version VARCHAR(120) PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  for(const file of files){
    const applied=await pool.query('SELECT 1 FROM public.schema_migrations WHERE version=$1',[file]);if(applied.rowCount)continue;
    const sql=await readFile(join(directory,file),'utf8');const client=await pool.connect();
    try{await client.query('BEGIN');await client.query(sql);await client.query('INSERT INTO public.schema_migrations(version) VALUES($1)',[file]);await client.query('COMMIT');console.info(`Applied ${file}`)}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
  }
}finally{await closePool()}
