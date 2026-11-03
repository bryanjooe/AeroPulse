import type { AirportDatabase, Airport, Booking, Flight, Seat, Ticket } from '../types';

const isoDay = (offset: number, hour = 8) => {
  const value = new Date(); value.setDate(value.getDate() + offset); value.setHours(hour, 0, 0, 0); return value.toISOString();
};

const airports: Airport[] = ([
  ['JFK','KJFK','John F. Kennedy International Airport','New York','United States','America/New_York'],
  ['LHR','EGLL','Heathrow Airport','London','United Kingdom','Europe/London'],
  ['SFO','KSFO','San Francisco International Airport','San Francisco','United States','America/Los_Angeles'],
  ['DXB','OMDB','Dubai International Airport','Dubai','United Arab Emirates','Asia/Dubai'],
  ['SIN','WSSS','Singapore Changi Airport','Singapore','Singapore','Asia/Singapore']
] as [string,string,string,string,string,string][]).map((a, i) => ({ airport_id: i + 1, iata_code: a[0], icao_code: a[1], name: a[2], city: a[3], country: a[4], timezone: a[5], created_at: isoDay(-90) }));

const airlines = [
  { airline_id: 1, iata_code: 'AA', name: 'American Airlines', country: 'United States', active: true },
  { airline_id: 2, iata_code: 'BA', name: 'British Airways', country: 'United Kingdom', active: true },
  { airline_id: 3, iata_code: 'EK', name: 'Emirates', country: 'United Arab Emirates', active: true },
  { airline_id: 4, iata_code: 'SQ', name: 'Singapore Airlines', country: 'Singapore', active: true }
];
const fleet = ([
  ['N100AA','Boeing 737-800','Boeing',1],['N200AA','Boeing 787-9','Boeing',1],['G-BA01','Airbus A320neo','Airbus',2],['G-BA02','Boeing 777-300ER','Boeing',2],
  ['A6-EK01','Airbus A380-800','Airbus',3],['A6-EK02','Boeing 777-300ER','Boeing',3],['9V-SQ01','Airbus A350-900','Airbus',4],['9V-SQ02','Boeing 787-10','Boeing',4]
] as [string,string,string,number][]).map((a, i) => ({ aircraft_id: i + 1, registration: a[0], model: a[1], manufacturer: a[2], airline_id: a[3], in_service: i !== 7 }));

const passengers = Array.from({ length: 20 }, (_, i) => {
  const first = ['Alex','Maya','Oliver','Sophia','Liam','Emma','Noah','Ava','Ethan','Isabella','Lucas','Mia','Mason','Amelia','James','Harper','Elijah','Evelyn','Benjamin','Charlotte'][i];
  const last = ['Chen','Patel','Smith','Jones','Brown','Wilson','Davis','Miller','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Garcia','Martinez','Robinson'][i];
  return { passenger_id: i + 1, email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`, first_name: first, last_name: last, date_of_birth: `19${74 + (i % 24)}-${String((i % 12)+1).padStart(2,'0')}-12`, passport_number: `P${String(1000001+i)}`, passport_country: ['United States','India','United Kingdom','Canada','Singapore'][i % 5], created_at: isoDay(-60-i) };
});

const terminals = airports.map((_, i) => ({ terminal_id: i + 1, airport_id: i + 1, terminal_code: 'T1', name: 'Main Terminal' }));
const gates = airports.flatMap((_, i) => ['A1','A2','A3'].map((code, j) => ({ gate_id: i*3+j+1, terminal_id: i+1, airport_id: i+1, gate_code: code })));
const crew_members = Array.from({ length: 12 }, (_, i) => ({
  crew_member_id: i + 1, airline_id: Math.floor(i / 3) + 1, employee_number: `${['AA','BA','EK','SQ'][Math.floor(i/3)]}-C${String(i%3+1).padStart(3,'0')}`,
  full_name: ['Jordan Lee','Avery Brooks','Casey Morgan','Taylor James','Alex Taylor','Jamie Clark','Samir Khan','Noor Haddad','Layla Rahman','Wei Ming','Amara Lim','Priya Nair'][i],
  job_title: ['Captain','First Officer','Purser'][i % 3], active: true
}));
const seats: Seat[] = fleet.flatMap((plane) => Array.from({ length: 24 }, (_, i) => ({
  seat_id: (plane.aircraft_id - 1) * 24 + i + 1, aircraft_id: plane.aircraft_id,
  seat_number: `${Math.floor(i/2)+1}${i%2 ? 'B' : 'A'}`,
  class: Math.floor(i/2) < 1 ? 'First' : Math.floor(i/2) < 3 ? 'Business' : 'Economy'
})));
const routes: [number,number,number,number,number,string,string,number][] = [
  [1,1,1,2,1,'AA101','scheduled',3],[2,4,2,1,2,'BA202','boarding',0],[1,2,3,1,3,'AA303','delayed',-1],[2,3,2,4,1,'BA404','scheduled',5],
  [3,5,4,5,2,'EK505','in_air',-1],[4,7,5,3,3,'SQ606','departed',-1],[1,1,1,3,2,'AA707','scheduled',7],[2,4,2,5,1,'BA808','scheduled',8],
  [3,6,4,2,3,'EK909','completed',-2],[4,8,5,4,1,'SQ110','scheduled',9],[1,2,1,4,2,'AA211','cancelled',2],[2,3,2,3,3,'BA312','scheduled',11],
  [3,5,4,1,1,'EK413','scheduled',12],[4,7,5,2,2,'SQ514','delayed',-1],[3,6,4,5,3,'EK615','scheduled',14]
];
const flights: Flight[] = routes.map(([airline_id,aircraft_id,origin_airport_id,destination_airport_id,gateIndex,flight_number,status,offset], i) => {
  const departure_at = isoDay(offset, 7 + (i % 10));
  const arrival = new Date(departure_at); arrival.setHours(arrival.getHours() + [5,7,6,8,7,14][i%6]);
  return { flight_id: i+1, airline_id, aircraft_id, origin_airport_id, destination_airport_id,
    departure_gate_id: (origin_airport_id-1)*3 + gateIndex, arrival_gate_id: (destination_airport_id-1)*3 + 1,
    flight_number, departure_at, arrival_at: arrival.toISOString(),
    actual_departure_at: ['departed','in_air','landed','completed'].includes(status as string) ? departure_at : null,
    actual_arrival_at: ['landed','completed'].includes(status as string) ? arrival.toISOString() : null,
    status: status as Flight['status'] };
});
const bookings: Booking[] = Array.from({ length: 30 }, (_, i) => ({ booking_id: i+1, booking_reference: `AP${String(873210+i)}`,
  passenger_id: (i%20)+1, flight_id: (i%15)+1, status: i===28 ? 'cancelled' : 'confirmed', booked_at: isoDay(-((i%20)+1), 10),
  cancelled_at: i===28 ? isoDay(-1) : null, created_by: 2 }));
const activeBookingIds = bookings.filter(b => b.status === 'confirmed').map(b => b.booking_id);
const ticketCountByFlight = new Map<number,number>();
const tickets: Ticket[] = activeBookingIds.map(booking_id => {
  const booking = bookings.find(b => b.booking_id === booking_id)!;
  const flight = flights.find(f => f.flight_id === booking.flight_id)!;
  // Seat numbers restart for each flight because the same aircraft seat can be sold on later legs.
  const flightSeatIndex=ticketCountByFlight.get(flight.flight_id)??0;
  ticketCountByFlight.set(flight.flight_id,flightSeatIndex+1);
  const seat = seats.find(s => s.aircraft_id === flight.aircraft_id && s.seat_number === `${Math.floor(flightSeatIndex/2)+1}${flightSeatIndex%2 ? 'B':'A'}`)!;
  return { ticket_id: booking_id, booking_id, flight_id: flight.flight_id, aircraft_id: flight.aircraft_id, seat_id: seat.seat_id,
    status: 'active', fare: seat.class === 'First' ? 1200 : seat.class === 'Business' ? 520 : 180, issued_at: booking.booked_at };
});
const payments = bookings.map((b, i) => ({ payment_id: i+1, booking_id: b.booking_id, amount: i%5===0 ? 520 : 180,
  currency: 'USD', method: (['card','card','wallet','bank_transfer','card'] as const)[i%5], status: b.status==='cancelled' ? 'refunded' as const : 'succeeded' as const,
  transaction_reference: `PAY-AP${String(873210+i)}`, paid_at: isoDay(-((i%20)+1)), created_at: isoDay(-((i%20)+1)) }));
const baggage = tickets.slice(0, 18).map((t, i) => ({ baggage_id: i+1, ticket_id: t.ticket_id, tag_number: `BG-${String(500001+i)}`,
  weight_kg: 16 + (i%13), status: (['checked_in','loaded','in_transit','claimed'][i%4]) as 'checked_in'|'loaded'|'in_transit'|'claimed', checked_in_at: isoDay(-1, 11) }));
const flight_crew = flights.flatMap(f => crew_members.filter(c => c.airline_id===f.airline_id).map(c => ({ flight_id: f.flight_id, crew_member_id: c.crew_member_id, assignment_role: c.job_title })));
const users_staff = [
  { staff_id: 1, email: 'morgan.chen@aeropulse.example', full_name: 'Morgan Chen', role: 'operations' as const, active: true, created_at: isoDay(-120) },
  { staff_id: 2, email: 'riley.patel@aeropulse.example', full_name: 'Riley Patel', role: 'agent' as const, active: true, created_at: isoDay(-100) },
  { staff_id: 3, email: 'alex.morgan@aeropulse.example', full_name: 'Alex Morgan', role: 'admin' as const, active: true, created_at: isoDay(-200) },
  { staff_id: 4, email: 'jordan.lee@aeropulse.example', full_name: 'Jordan Lee', role: 'finance' as const, active: true, created_at: isoDay(-90) }
];
const audit_log = Array.from({ length: 8 }, (_, i) => ({ audit_id: i+1, table_name: i%2 ? 'flights' : 'bookings', record_id: i+1,
  operation: (i%3===0 ? 'INSERT' : 'UPDATE') as 'INSERT'|'UPDATE'|'DELETE', changed_at: isoDay(-i, 12), changed_by: (i%4)+1,
  old_values: i%3===0 ? null : { status: 'scheduled' }, new_values: { status: i%2 ? 'delayed' : 'confirmed' } }));

const seedDb: AirportDatabase = { airports, airlines, aircraft: fleet, terminals, gates, users_staff, crew_members, passengers, seats, flights, flight_crew, bookings, tickets, payments, baggage, audit_log };
const storageKey = 'aeropulse.mock-database.v1';
function loadStoredDatabase(): AirportDatabase {
  if (typeof window === 'undefined') return structuredClone(seedDb);
  try {
    const serialized=window.localStorage.getItem(storageKey);
    if(!serialized)return structuredClone(seedDb);
    const stored=JSON.parse(serialized) as Partial<AirportDatabase>;
    return { ...structuredClone(seedDb), ...stored };
  } catch { return structuredClone(seedDb); }
}
export const mockDb: AirportDatabase = loadStoredDatabase();

function persistDatabase():void {
  if(typeof window==='undefined')return;
  try { window.localStorage.setItem(storageKey,JSON.stringify(mockDb)); } catch { /* Storage can be unavailable in private browser contexts. */ }
}
function recordAudit(table_name:string,record_id:number,operation:'INSERT'|'UPDATE'|'DELETE',old_values:Record<string,unknown>|null,new_values:Record<string,unknown>|null):void {
  const row={audit_id:Math.max(0,...mockDb.audit_log.map(x=>x.audit_id))+1,table_name,record_id,operation,changed_at:new Date().toISOString(),changed_by:3,old_values,new_values};
  mockDb.audit_log.unshift(row);
}

const pause = () => new Promise(resolve => setTimeout(resolve, 320));
function syncElapsedFlights():void{
  const now=Date.now();let changed=false;
  for(const flight of mockDb.flights){
    if((flight.status==='scheduled'||flight.status==='boarding')&&new Date(flight.departure_at).getTime()<=now){flight.status='departed';flight.actual_departure_at=flight.actual_departure_at??new Date().toISOString();recordAudit('flights',flight.flight_id,'UPDATE',{status:'scheduled'},{status:'departed'});changed=true;}
    if((flight.status==='departed'||flight.status==='in_air'||flight.status==='landed')&&new Date(flight.arrival_at).getTime()<=now){flight.status='completed';flight.actual_arrival_at=flight.actual_arrival_at??new Date().toISOString();recordAudit('flights',flight.flight_id,'UPDATE',{status:'in_air'},{status:'completed'});changed=true;}
  }
  if(changed)persistDatabase();
}
export async function getDatabase(): Promise<AirportDatabase> { await pause(); syncElapsedFlights(); return structuredClone(mockDb); }
export async function createFlight(input: { airline_id:number; aircraft_id:number; flight_number:string; origin_airport_id:number; destination_airport_id:number; departure_gate_id:number; arrival_gate_id:number; departure_at:string; arrival_at:string }): Promise<Flight> {
  await pause();
  if(input.origin_airport_id===input.destination_airport_id)throw new Error('Origin and destination must be different airports.');
  if(new Date(input.arrival_at)<=new Date(input.departure_at))throw new Error('Arrival time must be after departure time.');
  if(!mockDb.aircraft.some(a=>a.aircraft_id===input.aircraft_id&&a.airline_id===input.airline_id))throw new Error('Choose an aircraft operated by the selected airline.');
  const flight:Flight={flight_id:Math.max(...mockDb.flights.map(f=>f.flight_id))+1,...input,actual_departure_at:null,actual_arrival_at:null,status:'scheduled'};
  mockDb.flights.unshift(flight);recordAudit('flights',flight.flight_id,'INSERT',null,{...flight});persistDatabase();return flight;
}
export async function createBooking(input: { passenger_id: number; flight_id: number; seat_id: number; method: 'card'|'cash'|'bank_transfer'|'wallet'; new_passenger?: { first_name:string; last_name:string; email:string } }): Promise<Booking> {
  await pause();
  const flight = mockDb.flights.find(f => f.flight_id === input.flight_id);
  const seat = mockDb.seats.find(s => s.seat_id === input.seat_id);
  if (!flight || !seat || seat.aircraft_id !== flight.aircraft_id) throw new Error('That seat is not available on this flight.');
  if(flight.status==='cancelled')throw new Error('This flight has been cancelled.');
  if(!mockDb.passengers.some(p=>p.passenger_id===input.passenger_id)&&!input.new_passenger)throw new Error('Select an existing passenger or enter new passenger details.');
  const taken = mockDb.tickets.some(t => t.flight_id === flight.flight_id && t.seat_id === seat.seat_id && t.status === 'active');
  if (taken) throw new Error('Someone just booked that seat. Please choose another one.');
  if (input.new_passenger && !mockDb.passengers.some(p=>p.email===input.new_passenger?.email)) {
    const passenger_id=Math.max(...mockDb.passengers.map(p=>p.passenger_id))+1;
    mockDb.passengers.push({passenger_id,...input.new_passenger,date_of_birth:'1990-01-01',passport_number:null,passport_country:null,created_at:new Date().toISOString()});
  }
  const passenger_id=input.new_passenger ? mockDb.passengers.find(p=>p.email===input.new_passenger?.email)!.passenger_id : input.passenger_id;
  const id = Math.max(...mockDb.bookings.map(b => b.booking_id)) + 1;
  const booking: Booking = { booking_id: id, booking_reference: `AP${Math.random().toString(36).slice(2,8).toUpperCase()}`,
    passenger_id, flight_id: input.flight_id, status: 'confirmed', booked_at: new Date().toISOString(), cancelled_at: null, created_by: 2 };
  mockDb.bookings.unshift(booking);
  mockDb.tickets.unshift({ ticket_id: Math.max(...mockDb.tickets.map(t=>t.ticket_id))+1, booking_id: id, flight_id: flight.flight_id,
    aircraft_id: flight.aircraft_id, seat_id: seat.seat_id, status: 'active', fare: seat.class==='First'?1200:seat.class==='Business'?520:180, issued_at: new Date().toISOString() });
  const fare=seat.class==='First'?1200:seat.class==='Business'?520:180;
  mockDb.payments.unshift({payment_id:Math.max(...mockDb.payments.map(p=>p.payment_id))+1,booking_id:id,amount:fare,currency:'USD',method:input.method,status:'succeeded',transaction_reference:`PAY-${booking.booking_reference}`,paid_at:new Date().toISOString(),created_at:new Date().toISOString()});
  recordAudit('bookings',id,'INSERT',null,{...booking});persistDatabase();
  return booking;
}

export async function cancelBooking(booking_id:number):Promise<void>{
  await pause();const booking=mockDb.bookings.find(b=>b.booking_id===booking_id);
  if(!booking||booking.status!=='confirmed')throw new Error('Only a confirmed booking can be cancelled.');
  const old={...booking};booking.status='cancelled';booking.cancelled_at=new Date().toISOString();
  mockDb.tickets.filter(t=>t.booking_id===booking_id).forEach(t=>{t.status='void'});
  mockDb.payments.filter(p=>p.booking_id===booking_id&&p.status==='succeeded').forEach(p=>{p.status='refunded'});
  recordAudit('bookings',booking_id,'UPDATE',old,{...booking});persistDatabase();
}

export async function changeFlightStatus(flight_id:number,status:Flight['status']):Promise<void>{
  await pause();const flight=mockDb.flights.find(f=>f.flight_id===flight_id);if(!flight)throw new Error('Flight not found.');
  const old={...flight};flight.status=status;
  if(status==='departed'||status==='in_air'||status==='landed'||status==='completed')flight.actual_departure_at=flight.actual_departure_at??new Date().toISOString();
  if(status==='landed'||status==='completed')flight.actual_arrival_at=flight.actual_arrival_at??new Date().toISOString();
  recordAudit('flights',flight_id,'UPDATE',old,{...flight});persistDatabase();
}

export async function assignCrew(flight_id:number,crew_member_id:number,assignment_role?:string):Promise<void>{
  await pause();const flight=mockDb.flights.find(f=>f.flight_id===flight_id);const crew=mockDb.crew_members.find(c=>c.crew_member_id===crew_member_id);
  if(!flight||!crew)throw new Error('Select a valid flight and crew member.');
  if(crew.airline_id!==flight.airline_id)throw new Error('Crew must belong to the operating airline.');
  const start=new Date(flight.departure_at).getTime(),end=new Date(flight.arrival_at).getTime();
  const conflict=mockDb.flight_crew.some(fc=>fc.crew_member_id===crew_member_id&&mockDb.flights.some(other=>other.flight_id===fc.flight_id&&other.flight_id!==flight_id&&new Date(other.departure_at).getTime()<end&&new Date(other.arrival_at).getTime()>start));
  if(conflict)throw new Error(`${crew.full_name} already has an overlapping flight assignment.`);
  if(mockDb.flight_crew.some(fc=>fc.flight_id===flight_id&&fc.crew_member_id===crew_member_id))throw new Error('Crew member is already assigned to this flight.');
  const assignment={flight_id,crew_member_id,assignment_role:assignment_role??crew.job_title};mockDb.flight_crew.push(assignment);
  recordAudit('flight_crew',flight_id,'INSERT',null,{...assignment});persistDatabase();
}

export async function updateBaggage(baggage_id:number,weight_kg:number,status:AirportDatabase['baggage'][number]['status']='checked_in'):Promise<void>{
  await pause();if(weight_kg<=0||weight_kg>100)throw new Error('Bag weight must be between 0 and 100 kg.');
  const bag=mockDb.baggage.find(b=>b.baggage_id===baggage_id);if(!bag)throw new Error('Baggage record not found.');
  const old={...bag};bag.weight_kg=weight_kg;bag.status=status;recordAudit('baggage',baggage_id,'UPDATE',old,{...bag});persistDatabase();
}

export type CrudTable='airports'|'airlines'|'aircraft'|'passengers'|'crew_members'|'gates'|'users_staff';
const idField:Record<CrudTable,string>={airports:'airport_id',airlines:'airline_id',aircraft:'aircraft_id',passengers:'passenger_id',crew_members:'crew_member_id',gates:'gate_id',users_staff:'staff_id'};
export async function saveRecord(table:CrudTable,input:Record<string,unknown>,id?:number):Promise<Record<string,unknown>>{
  await pause();const field=idField[table];const rows=mockDb[table] as unknown as Record<string,unknown>[];
  const uniqueField:Partial<Record<CrudTable,string>>={airports:'iata_code',airlines:'iata_code',aircraft:'registration',passengers:'email',crew_members:'employee_number',users_staff:'email'};
  const unique=uniqueField[table];if(unique&&rows.some(row=>row[unique]===input[unique]&&row[field]!==id))throw new Error(`A ${table==='aircraft'?'registration':unique.replace('_',' ')} with this value already exists.`);
  if(id!==undefined){const row=rows.find(x=>x[field]===id);if(!row)throw new Error('Record no longer exists.');const old={...row};Object.assign(row,input);recordAudit(table,id,'UPDATE',old,{...row});persistDatabase();return row;}
  const next=Math.max(0,...rows.map(x=>Number(x[field])||0))+1;
  const record={...input,[field]:next,created_at:new Date().toISOString()};
  if(table==='airports'){(record as Record<string,unknown>).icao_code??=null;}
  if(table==='airlines'){(record as Record<string,unknown>).active??=true;}
  if(table==='aircraft'){(record as Record<string,unknown>).in_service??=true;}
  if(table==='passengers'){(record as Record<string,unknown>).passport_number??=null;(record as Record<string,unknown>).passport_country??=null;}
  if(table==='crew_members'){(record as Record<string,unknown>).active??=true;}
  if(table==='users_staff'){(record as Record<string,unknown>).active??=true;}
  rows.unshift(record);recordAudit(table,next,'INSERT',null,{...record});
  if(table==='aircraft'){
    const aircraftId=next;
    for(let index=0;index<24;index++){const row=Math.floor(index/2)+1;mockDb.seats.push({seat_id:Math.max(0,...mockDb.seats.map(s=>s.seat_id))+1,aircraft_id:aircraftId,seat_number:`${row}${index%2?'B':'A'}`,class:row===1?'First':row<=3?'Business':'Economy'});}
  }
  persistDatabase();return record;
}
export async function deleteRecord(table:CrudTable,id:number):Promise<void>{
  await pause();const field=idField[table];const rows=mockDb[table] as unknown as Record<string,unknown>[];const row=rows.find(x=>x[field]===id);if(!row)throw new Error('Record no longer exists.');
  const block:(keyof AirportDatabase)[]=[];
  if(table==='airlines'){if(mockDb.aircraft.some(x=>x.airline_id===id)||mockDb.flights.some(x=>x.airline_id===id))block.push('aircraft','flights');}
  if(table==='airports'&&(mockDb.flights.some(x=>x.origin_airport_id===id||x.destination_airport_id===id)||mockDb.terminals.some(x=>x.airport_id===id)))block.push('flights','terminals');
  if(table==='aircraft'&&(mockDb.flights.some(x=>x.aircraft_id===id)||mockDb.tickets.some(x=>x.aircraft_id===id)))block.push('flights','tickets');
  if(table==='passengers'&&mockDb.bookings.some(x=>x.passenger_id===id))block.push('bookings');
  if(table==='crew_members'&&mockDb.flight_crew.some(x=>x.crew_member_id===id))block.push('flight_crew');
  if(table==='gates'&&mockDb.flights.some(x=>x.departure_gate_id===id||x.arrival_gate_id===id))block.push('flights');
  if(block.length)throw new Error(`Cannot delete this ${table.slice(0,-1)} while related ${[...new Set(block)].join(', ')} records exist.`);
  rows.splice(rows.indexOf(row),1);recordAudit(table,id,'DELETE',{...row},null);persistDatabase();
}

export function resetMockDatabase():void{
  for(const key of Object.keys(seedDb) as (keyof AirportDatabase)[]){(mockDb[key] as unknown)=(structuredClone(seedDb[key]) as unknown);}
  persistDatabase();
}

export type DatabaseSnapshot = Pick<AirportDatabase, 'airports'|'airlines'|'aircraft'|'terminals'|'gates'|'users_staff'|'crew_members'|'passengers'|'seats'|'flights'|'flight_crew'|'bookings'|'tickets'|'payments'|'baggage'|'audit_log'>;
