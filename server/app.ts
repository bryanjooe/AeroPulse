import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate, clearSessionCookie, issueSession, loggedInUser, requireAdmin, requireSameOrigin, setSessionCookie } from './auth.ts';
import { closePool, pool, withTransaction } from './db.ts';
import { config } from './config.ts';
import { allowedColumns, idColumns, resourceTables, serializeRows, toSafeJson } from './data.ts';
import { getDatabaseSnapshot } from './snapshot.ts';
import { getObjects, getObjectRows, getObjectDetails } from './dev-database.ts';

export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`));
  next();
});
app.use('/api', requireSameOrigin);

const fail = (res: Response, status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
const idParam = z.string().regex(/^[1-9]\d{0,15}$/).transform(Number).refine(Number.isSafeInteger);
const idFrom = (req: Request, res: Response): number | null => { const value = idParam.safeParse(req.params.id); if (!value.success) { fail(res, 400, 'invalid_id', 'ID must be a positive safe integer.'); return null; } return value.data; };
const limitSchema = z.coerce.number().int().min(1).max(100).default(50);
const genericSchemas: Record<string, z.ZodObject<any>> = {
  airports: z.object({ iata_code:z.string().regex(/^[A-Z]{3}$/), icao_code:z.string().regex(/^[A-Z]{4}$/).nullable().optional(), name:z.string().min(2).max(200), city:z.string().min(2).max(120), country:z.string().min(2).max(120), timezone:z.string().min(3).max(80) }).strict(),
  airlines: z.object({ iata_code:z.string().regex(/^[A-Z0-9]{2}$/), name:z.string().min(2).max(200), country:z.string().min(2).max(120), active:z.boolean().optional() }).strict(),
  aircraft: z.object({ airline_id:z.number().int().positive().safe(), registration:z.string().min(3).max(12), model:z.string().min(2).max(100), manufacturer:z.string().min(2).max(100), in_service:z.boolean().optional() }).strict(),
  passengers: z.object({ first_name:z.string().min(1).max(100), last_name:z.string().min(1).max(100), email:z.string().email().max(254), date_of_birth:z.string().date(), passport_number:z.string().max(20).nullable().optional(), passport_country:z.string().max(100).nullable().optional() }).strict(),
  crew_members: z.object({ airline_id:z.number().int().positive().safe(), employee_number:z.string().min(3).max(24), full_name:z.string().min(2).max(150), job_title:z.enum(['Captain','First Officer','Flight Attendant','Purser','Engineer']), active:z.boolean().optional() }).strict(),
  gates: z.object({ airport_id:z.number().int().positive().safe(), terminal_id:z.number().int().positive().safe(), gate_code:z.string().min(1).max(8) }).strict(),
  users_staff: z.object({ email:z.string().email().max(254), full_name:z.string().min(2).max(150), role:z.enum(['admin','operations','agent','finance']), active:z.boolean().optional() }).strict(),
};

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status:'ok', database:'connected' }); }
  catch { res.status(503).json({ status:'degraded', database:'unavailable' }); }
});
app.post('/api/auth/login', async (req, res) => {
  const body = z.object({ email:z.string().email().max(254), password:z.string().min(1).max(256) }).safeParse(req.body);
  if (!body.success) return fail(res, 400, 'invalid_input', 'Enter a valid email and password.');
  if (!authenticate(body.data.email, body.data.password)) return fail(res, 401, 'invalid_credentials', 'Email or password was not accepted.');
  try {
    const result = await pool.query('SELECT email, full_name, role FROM users_staff WHERE lower(email::text)=lower($1) AND active=true LIMIT 1', [body.data.email]);
    const user = result.rows[0] ?? { email:body.data.email,full_name:body.data.email,role:'admin' };
    setSessionCookie(res, issueSession(body.data.email));
    return res.json({ user: toSafeJson(user), authenticated: true });
  } catch { return fail(res, 503, 'database_unavailable', 'Sign-in service is temporarily unavailable.'); }
});
app.post('/api/auth/logout', (_req, res) => { clearSessionCookie(res); res.status(204).end(); });
app.get('/api/auth/session', requireAdmin, (req, res) => res.json({ user: loggedInUser(req), authenticated:true }));

app.use('/api', requireAdmin);
app.get('/api/database', async (_req, res, next) => { try { res.json(await getDatabaseSnapshot()); } catch (e) { next(e); } });
app.get('/api/flights/:id/available-seats',async(req,res,next)=>{const id=idFrom(req,res);if(id===null)return;try{const rows=await pool.query('SELECT * FROM get_available_seats($1)',[id]);res.json({seats:serializeRows('seats',rows.rows)})}catch(e){next(e)}});
app.post('/api/flights',async(req,res,next)=>{const schema=z.object({airline_id:z.number().int().positive().safe(),aircraft_id:z.number().int().positive().safe(),flight_number:z.string().min(3).max(8),origin_airport_id:z.number().int().positive().safe(),destination_airport_id:z.number().int().positive().safe(),departure_gate_id:z.number().int().positive().nullable().optional(),arrival_gate_id:z.number().int().positive().nullable().optional(),departure_at:z.string().datetime({offset:true}),arrival_at:z.string().datetime({offset:true})}).strict().refine(x=>x.origin_airport_id!==x.destination_airport_id,{message:'Origin and destination must be different.'}).refine(x=>new Date(x.arrival_at)>new Date(x.departure_at),{message:'Arrival must be after departure.'});const parsed=schema.safeParse(req.body);if(!parsed.success)return fail(res,400,'validation_error','Flight details are invalid.');try{const x=parsed.data;const result=await pool.query(`INSERT INTO flights(airline_id,aircraft_id,flight_number,origin_airport_id,destination_airport_id,departure_gate_id,arrival_gate_id,departure_at,arrival_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[x.airline_id,x.aircraft_id,x.flight_number,x.origin_airport_id,x.destination_airport_id,x.departure_gate_id??null,x.arrival_gate_id??null,x.departure_at,x.arrival_at]);res.status(201).json({record:serializeRows('flights',result.rows)[0]})}catch(e){next(e)}});

app.get('/api/resources/:table', async (req, res, next) => {
  const table = req.params.table;
  if (!resourceTables.includes(table as never)) return fail(res, 404, 'unknown_resource', 'Resource was not found.');
  const limit = limitSchema.safeParse(req.query.limit ?? 100);
  const offset = z.coerce.number().int().min(0).max(1_000_000).safeParse(req.query.offset ?? 0);
  if (!limit.success || !offset.success) return fail(res, 400, 'invalid_pagination', 'Limit must be 1–100 and offset must be nonnegative.');
  try {
    const idColumn = idColumns[table];
    const result = await pool.query(`SELECT * FROM public."${table}" ORDER BY "${idColumn}" LIMIT $1 OFFSET $2`, [limit.data, offset.data]);
    res.json({ rows:serializeRows(table, result.rows), limit:limit.data, offset:offset.data });
  } catch (e) { next(e); }
});

app.post('/api/resources/:table', async (req, res, next) => {
  const table = req.params.table;
  const schema = genericSchemas[table];
  if (!schema) return fail(res, 404, 'unknown_resource', 'Resource cannot be created here.');
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'validation_error', parsed.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; '));
  const values = Object.entries(parsed.data as Record<string, unknown>).filter(([key])=>allowedColumns[table]?.includes(key));
  if (values.length !== Object.keys(parsed.data as object).length) return fail(res, 400, 'invalid_fields', 'One or more fields are not allowed.');
  try {
    const cols=values.map(([key])=>`"${key}"`).join(','); const params=values.map(([,value])=>value); const placeholders=params.map((_,i)=>`$${i+1}`).join(',');
    const result=await pool.query(`INSERT INTO public."${table}" (${cols}) VALUES (${placeholders}) RETURNING *`,params);
    res.status(201).json({ record:serializeRows(table,result.rows)[0] });
  } catch(e){next(e)}
});

app.patch('/api/resources/:table/:id', async (req, res, next) => {
  const table=req.params.table, schema=genericSchemas[table], id=idFrom(req,res);
  if (id===null) return; if(!schema||!resourceTables.includes(table as never)) return fail(res,404,'unknown_resource','Resource was not found.');
  const parsed=schema.partial().safeParse(req.body);
  if(!parsed.success||!Object.keys(req.body??{}).length) return fail(res,400,'validation_error',parsed.success?'At least one field is required.':'Update fields are invalid.');
  const values=Object.entries(parsed.data as Record<string,unknown>).filter(([key])=>allowedColumns[table]?.includes(key));
  if(values.length!==Object.keys(parsed.data as object).length) return fail(res,400,'invalid_fields','One or more fields are not allowed.');
  try {
    const sets=values.map(([key],i)=>`"${key}"=$${i+1}`).join(',');
    const result=await pool.query(`UPDATE public."${table}" SET ${sets} WHERE "${idColumns[table]}"=$${values.length+1} RETURNING *`,[...values.map(([,value])=>value),id]);
    if(!result.rowCount)return fail(res,404,'not_found','Record was not found.');
    res.json({record:serializeRows(table,result.rows)[0]});
  }catch(e){next(e)}
});

app.delete('/api/resources/:table/:id', async (req,res,next)=>{
  const table=req.params.table,id=idFrom(req,res);if(id===null)return;
  if(!allowedColumns[table])return fail(res,404,'unknown_resource','This resource cannot be deleted through the directory API.');
  try{const result=await pool.query(`DELETE FROM public."${table}" WHERE "${idColumns[table]}"=$1 RETURNING "${idColumns[table]}"`,[id]);if(!result.rowCount)return fail(res,404,'not_found','Record was not found.');res.status(204).end()}catch(e){next(e)}
});

app.post('/api/bookings', async (req,res,next)=>{
  const schema=z.object({ passenger_id:z.number().int().positive().safe(), flight_id:z.number().int().positive().safe(), seat_id:z.number().int().positive().safe(), method:z.enum(['card','cash','bank_transfer','wallet']), new_passenger:z.object({first_name:z.string().min(1).max(100),last_name:z.string().min(1).max(100),email:z.string().email().max(254),date_of_birth:z.string().date().optional()}).optional() }).strict();
  const parsed=schema.safeParse(req.body);if(!parsed.success)return fail(res,400,'validation_error','Booking details are invalid.');
  try{
    const booking=await withTransaction(async client=>{
      let passengerId=parsed.data.passenger_id;
      if(parsed.data.new_passenger){const p=parsed.data.new_passenger;const passenger=await client.query(`INSERT INTO passengers(first_name,last_name,email,date_of_birth) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING passenger_id`,[p.first_name,p.last_name,p.email,p.date_of_birth??'1990-01-01']);passengerId=Number(passenger.rows[0].passenger_id);}
      const staff=await client.query('SELECT staff_id FROM users_staff WHERE lower(email::text)=lower($1) AND active=true LIMIT 1',[res.locals.session.email]);
      const result=await client.query('SELECT book_ticket($1,$2,$3,$4,$5) AS booking_id',[passengerId,parsed.data.flight_id,parsed.data.seat_id,parsed.data.method,staff.rows[0]?.staff_id??null]);
      const row=await client.query('SELECT * FROM bookings WHERE booking_id=$1',[result.rows[0].booking_id]);return row.rows[0];
    });res.status(201).json({booking:serializeRows('bookings',[booking])[0]});
  }catch(e){next(e)}
});
app.post('/api/bookings/:id/cancel', async(req,res,next)=>{const id=idFrom(req,res);if(id===null)return;try{await withTransaction(async c=>{const user=await c.query('SELECT staff_id FROM users_staff WHERE lower(email::text)=lower($1) AND active=true LIMIT 1',[res.locals.session.email]);if(user.rows[0])await c.query("SELECT set_config('app.staff_id',$1,true)",[String(user.rows[0].staff_id)]);await c.query('SELECT cancel_booking($1)',[id])});res.status(204).end()}catch(e){next(e)}});

app.patch('/api/flights/:id/status',async(req,res,next)=>{const id=idFrom(req,res);if(id===null)return;const parsed=z.object({status:z.enum(['scheduled','boarding','delayed','departed','in_air','landed','completed','cancelled'])}).strict().safeParse(req.body);if(!parsed.success)return fail(res,400,'validation_error','Flight status is invalid.');try{const result=await pool.query(`UPDATE flights SET status=$1, actual_departure_at=CASE WHEN $1 IN ('departed','in_air','landed','completed') THEN COALESCE(actual_departure_at,now()) ELSE actual_departure_at END, actual_arrival_at=CASE WHEN $1 IN ('landed','completed') THEN COALESCE(actual_arrival_at,now()) ELSE actual_arrival_at END WHERE flight_id=$2 RETURNING *`,[parsed.data.status,id]);if(!result.rowCount)return fail(res,404,'not_found','Flight was not found.');res.json({flight:serializeRows('flights',result.rows)[0]})}catch(e){next(e)}});

app.post('/api/flights/:id/crew',async(req,res,next)=>{const id=idFrom(req,res);if(id===null)return;const parsed=z.object({crew_member_id:z.number().int().positive().safe(),assignment_role:z.string().min(2).max(100).optional()}).strict().safeParse(req.body);if(!parsed.success)return fail(res,400,'validation_error','Crew assignment is invalid.');try{await withTransaction(async c=>{const check=await c.query(`SELECT f.airline_id,f.departure_at,f.arrival_at,cm.airline_id AS crew_airline,cm.active,cm.job_title,cm.full_name FROM flights f JOIN crew_members cm ON cm.crew_member_id=$2 WHERE f.flight_id=$1`,[id,parsed.data.crew_member_id]);const x=check.rows[0];if(!x)throw Object.assign(new Error('Flight or crew member was not found.'),{status:404});if(!x.active||x.airline_id!==x.crew_airline)throw Object.assign(new Error('Crew member must be active and belong to the operating airline.'),{status:409});const overlap=await c.query(`SELECT 1 FROM flight_crew fc JOIN flights f ON f.flight_id=fc.flight_id WHERE fc.crew_member_id=$1 AND f.flight_id<>$2 AND f.departure_at<$4 AND f.arrival_at>$3 LIMIT 1`,[parsed.data.crew_member_id,id,x.departure_at,x.arrival_at]);if(overlap.rowCount)throw Object.assign(new Error('Crew member already has an overlapping flight assignment.'),{status:409});await c.query('INSERT INTO flight_crew(flight_id,crew_member_id,assignment_role) VALUES($1,$2,$3)',[id,parsed.data.crew_member_id,parsed.data.assignment_role??x.job_title])});res.status(201).json({assigned:true})}catch(e){next(e)}});

app.patch('/api/baggage/:id',async(req,res,next)=>{const id=idFrom(req,res);if(id===null)return;const parsed=z.object({weight_kg:z.number().positive().max(100),status:z.enum(['checked_in','loaded','in_transit','claimed','delayed'])}).strict().safeParse(req.body);if(!parsed.success)return fail(res,400,'validation_error','Baggage details are invalid.');try{const result=await pool.query('UPDATE baggage SET weight_kg=$1,status=$2 WHERE baggage_id=$3 RETURNING *',[parsed.data.weight_kg,parsed.data.status,id]);if(!result.rowCount)return fail(res,404,'not_found','Baggage record was not found.');res.json({baggage:serializeRows('baggage',result.rows)[0]})}catch(e){next(e)}});

app.get('/api/dev/database/objects',async(_req,res,next)=>{try{res.json({objects:await getObjects()})}catch(e){next(e)}});
app.get('/api/dev/database/objects/:name/details',async(req,res,next)=>{const name=z.string().regex(/^[a-z_][a-z0-9_]{0,62}$/).safeParse(req.params.name);if(!name.success)return fail(res,400,'invalid_object','Object name is invalid.');try{const data=await getObjectDetails(name.data);if(!data)return fail(res,404,'not_found','Database object was not found.');res.json(data)}catch(e){next(e)}});
app.get('/api/dev/database/objects/:name/rows',async(req,res,next)=>{const name=z.string().regex(/^[a-z_][a-z0-9_]{0,62}$/).safeParse(req.params.name),page=z.coerce.number().int().min(1).max(10_000).safeParse(req.query.page??1),limit=limitSchema.safeParse(req.query.limit??25),search=z.string().max(100).optional().safeParse(req.query.search??''),sort=z.string().max(63).optional().safeParse(req.query.sort),direction=z.enum(['asc','desc']).default('asc').safeParse(req.query.direction??'asc');if(!name.success||!page.success||!limit.success||!search.success||!sort.success||!direction.success)return fail(res,400,'invalid_query','Database browser query parameters are invalid.');try{const data=await getObjectRows(name.data,{page:page.data,limit:limit.data,search:search.data??'',sort:sort.data,direction:direction.data});if(!data)return fail(res,404,'not_found','Database object was not found.');res.json(data)}catch(e){next(e)}});

const errorHandler: ErrorRequestHandler=(error:unknown,_req,res,_next)=>{
  const e=error as {code?:string;status?:number;message?:string};
  if(e.status)return fail(res,e.status,'request_conflict',e.message??'Request could not be completed.');
  if(e.code==='23505')return fail(res,409,'duplicate_record','A record with the same unique value already exists.');
  if(e.code==='23503')return fail(res,409,'related_records','Related records prevent this change.');
  if(e.code==='23514'||e.code==='22P02'||e.code==='22007')return fail(res,400,'constraint_violation','The values do not satisfy database constraints.');
  if(e.code==='57014')return fail(res,408,'query_timeout','The query exceeded the allowed time.');
  if(config.NODE_ENV==='test')console.error('Test API error detail:',e.message);
  else console.error('API request failed:',e.code??'unknown_database_error');
  return fail(res,500,'internal_error','The request could not be completed.');
};
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server=app.listen(config.PORT,'0.0.0.0',()=>console.info(`Aeropulse API listening on port ${config.PORT}`));
  const shutdown=async()=>{server.close();await closePool();process.exit(0)};
  process.once('SIGINT',()=>void shutdown());process.once('SIGTERM',()=>void shutdown());
}
