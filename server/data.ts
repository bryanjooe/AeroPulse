export const resourceTables=['airports','airlines','aircraft','terminals','gates','users_staff','crew_members','passengers','seats','flights','flight_crew','bookings','tickets','payments','baggage','audit_log'] as const;
export type ResourceTable=typeof resourceTables[number];
export const idColumns:Record<string,string>={airports:'airport_id',airlines:'airline_id',aircraft:'aircraft_id',terminals:'terminal_id',gates:'gate_id',users_staff:'staff_id',crew_members:'crew_member_id',passengers:'passenger_id',seats:'seat_id',flights:'flight_id',flight_crew:'flight_id',bookings:'booking_id',tickets:'ticket_id',payments:'payment_id',baggage:'baggage_id',audit_log:'audit_id'};
export const allowedColumns:Record<string,string[]>={
  airports:['iata_code','icao_code','name','city','country','timezone'],airlines:['iata_code','name','country','active'],aircraft:['airline_id','registration','model','manufacturer','in_service'],
  passengers:['first_name','last_name','email','date_of_birth','passport_number','passport_country'],crew_members:['airline_id','employee_number','full_name','job_title','active'],gates:['airport_id','terminal_id','gate_code'],users_staff:['email','full_name','role','active'],
};
const safeIdKeys=new Set(['airport_id','airline_id','aircraft_id','terminal_id','gate_id','staff_id','crew_member_id','seat_id','flight_id','booking_id','ticket_id','payment_id','baggage_id','audit_id','passenger_id','record_id','changed_by','created_by']);
export function toSafeJson(value:unknown):unknown {
  if(Array.isArray(value))return value.map(toSafeJson);
  if(value instanceof Date)return value.toISOString();
  if(value&&typeof value==='object'){const obj=value as Record<string,unknown>;return Object.fromEntries(Object.entries(obj).map(([key,v])=>[key,safeIdKeys.has(key)&&v!==null?safeInteger(v):toSafeJson(v)]));}
  return value;
}
function safeInteger(value:unknown):number|null {if(value===null)return null;const number=typeof value==='bigint'?Number(value):typeof value==='string'?Number(value):value;if(typeof number!=='number'||!Number.isSafeInteger(number))throw new Error('This database ID exceeds the UI safe integer range.');return number;}
const monetaryKeys=new Set(['amount','fare','weight_kg','gross_revenue','refunds','net_revenue']);
export function serializeRows(_table:string,rows:Record<string,unknown>[]):Record<string,unknown>[] {
  return rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>{
    if(safeIdKeys.has(key)&&value!==null)return [key,safeInteger(value)];
    if(monetaryKeys.has(key)&&typeof value==='string'){const n=Number(value);if(!Number.isFinite(n))throw new Error('Invalid numeric database value.');return [key,n];}
    if(value instanceof Date)return [key,value.toISOString()];
    return [key,value];
  })));
}
