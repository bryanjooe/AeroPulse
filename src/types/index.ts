export type FlightStatus = 'scheduled' | 'boarding' | 'delayed' | 'departed' | 'in_air' | 'landed' | 'completed' | 'cancelled';
export type SeatClass = 'Economy' | 'Business' | 'First';
export type BookingStatus = 'confirmed' | 'cancelled';
export type TicketStatus = 'active' | 'void';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';
export type StaffRole = 'admin' | 'operations' | 'agent' | 'finance';

export interface Airport { airport_id: number; iata_code: string; icao_code: string | null; name: string; city: string; country: string; timezone: string; created_at: string }
export interface Airline { airline_id: number; iata_code: string; name: string; country: string; active: boolean }
export interface Aircraft { aircraft_id: number; airline_id: number; registration: string; model: string; manufacturer: string; in_service: boolean }
export interface Terminal { terminal_id: number; airport_id: number; terminal_code: string; name: string | null }
export interface Gate { gate_id: number; terminal_id: number; airport_id: number; gate_code: string }
export interface UserStaff { staff_id: number; email: string; full_name: string; role: StaffRole; active: boolean; created_at: string }
export interface CrewMember { crew_member_id: number; airline_id: number; employee_number: string; full_name: string; job_title: string; active: boolean }
export interface Passenger { passenger_id: number; email: string; first_name: string; last_name: string; date_of_birth: string; passport_number: string | null; passport_country: string | null; created_at: string }
export interface Seat { seat_id: number; aircraft_id: number; seat_number: string; class: SeatClass }
export interface Flight { flight_id: number; airline_id: number; aircraft_id: number; flight_number: string; origin_airport_id: number; destination_airport_id: number; departure_gate_id: number | null; arrival_gate_id: number | null; departure_at: string; arrival_at: string; actual_departure_at: string | null; actual_arrival_at: string | null; status: FlightStatus }
export interface FlightCrew { flight_id: number; crew_member_id: number; assignment_role: string }
export interface Booking { booking_id: number; booking_reference: string; passenger_id: number; flight_id: number; status: BookingStatus; booked_at: string; cancelled_at: string | null; created_by: number | null }
export interface Ticket { ticket_id: number; booking_id: number; flight_id: number; aircraft_id: number; seat_id: number; status: TicketStatus; fare: number; issued_at: string }
export interface Payment { payment_id: number; booking_id: number; amount: number; currency: string; method: 'card' | 'cash' | 'bank_transfer' | 'wallet'; status: PaymentStatus; transaction_reference: string | null; paid_at: string | null; created_at: string }
export interface Baggage { baggage_id: number; ticket_id: number; tag_number: string; weight_kg: number; status: 'checked_in' | 'loaded' | 'in_transit' | 'claimed' | 'delayed'; checked_in_at: string }
export interface AuditLog { audit_id: number; table_name: string; record_id: number | null; operation: 'INSERT' | 'UPDATE' | 'DELETE'; changed_at: string; changed_by: number | null; old_values: Record<string, unknown> | null; new_values: Record<string, unknown> | null }

/** Mirrors public.users_staff in schema.sql; the UI brief calls this staff_users. */
export type StaffUser = UserStaff;

export interface AirportDatabase {
  airports: Airport[]; airlines: Airline[]; aircraft: Aircraft[]; terminals: Terminal[]; gates: Gate[];
  users_staff: UserStaff[]; crew_members: CrewMember[]; passengers: Passenger[]; seats: Seat[];
  flights: Flight[]; flight_crew: FlightCrew[]; bookings: Booking[]; tickets: Ticket[];
  payments: Payment[]; baggage: Baggage[]; audit_log: AuditLog[];
}
