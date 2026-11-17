import { pool } from './db.ts';
import { idColumns, resourceTables, serializeRows } from './data.ts';

export async function getDatabaseSnapshot() {
  const entries=await Promise.all(resourceTables.map(async table=>{
    const order=idColumns[table];
    const result=table==='flight_crew'
      ?await pool.query('SELECT * FROM public.flight_crew ORDER BY flight_id,crew_member_id')
      :await pool.query(`SELECT * FROM public."${table}" ORDER BY "${order}"`);
    return [table,serializeRows(table,result.rows)] as const;
  }));
  return Object.fromEntries(entries);
}
