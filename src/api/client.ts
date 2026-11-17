import type { AirportDatabase, Booking, Flight, FlightStatus } from '../types';

type ApiErrorBody={error?:{code?:string;message?:string}};
async function request<T>(path:string,init:RequestInit={}):Promise<T>{
  let response:Response;
  try{response=await fetch(path,{...init,credentials:'same-origin',headers:{...(init.body?{'Content-Type':'application/json'}:{}),...init.headers}})}
  catch{return Promise.reject(new Error('The AeroPulse API could not be reached. Start the backend server and check its health endpoint.'))}
  if(!response.ok){let body:ApiErrorBody={};try{body=await response.json() as ApiErrorBody}catch{}throw new Error(body.error?.message??`Request failed (${response.status}).`)}
  if(response.status===204)return undefined as T;
  return response.json() as Promise<T>;
}
const json=(body:unknown):RequestInit=>({method:'POST',body:JSON.stringify(body)});
export type SessionResponse={authenticated:boolean;user?:{email:string;role:string;full_name?:string}};
export async function getSession():Promise<SessionResponse>{return request('/api/auth/session')}
export async function login(email:string,password:string):Promise<SessionResponse>{return request('/api/auth/login',json({email,password}))}
export async function logout():Promise<void>{await request('/api/auth/logout',{method:'POST'})}
export async function getDatabase():Promise<AirportDatabase>{return request('/api/database')}
export async function createFlight(input:Parameters<typeof import('./mock').createFlight>[0]):Promise<Flight>{const r=await request<{record:Flight}>('/api/resources/flights',json(input));return r.record}
export async function createBooking(input:Parameters<typeof import('./mock').createBooking>[0]):Promise<Booking>{const r=await request<{booking:Booking}>('/api/bookings',json(input));return r.booking}
export async function cancelBooking(id:number):Promise<void>{await request(`/api/bookings/${id}/cancel`,json({}))}
export async function changeFlightStatus(id:number,status:FlightStatus):Promise<void>{await request(`/api/flights/${id}/status`,{method:'PATCH',body:JSON.stringify({status})})}
export async function assignCrew(flight_id:number,crew_member_id:number,assignment_role?:string):Promise<void>{await request(`/api/flights/${flight_id}/crew`,json({crew_member_id,assignment_role}))}
export async function updateBaggage(id:number,weight_kg:number,status:string):Promise<void>{await request(`/api/baggage/${id}`,{method:'PATCH',body:JSON.stringify({weight_kg,status})})}
export type CrudTable='airports'|'airlines'|'aircraft'|'passengers'|'crew_members'|'gates'|'users_staff';
export async function saveRecord(table:CrudTable,input:Record<string,unknown>,id?:number):Promise<Record<string,unknown>>{const r=await request<{record:Record<string,unknown>}>(id===undefined?`/api/resources/${table}`:`/api/resources/${table}/${id}`,{method:id===undefined?'POST':'PATCH',body:JSON.stringify(input)});return r.record}
export async function deleteRecord(table:CrudTable,id:number):Promise<void>{await request(`/api/resources/${table}/${id}`,{method:'DELETE'})}
