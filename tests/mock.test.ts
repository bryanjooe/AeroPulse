import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { assignCrew, cancelBooking, changeFlightStatus, createBooking, createFlight, mockDb, resetMockDatabase } from '../src/api/mock.ts';

beforeEach(() => resetMockDatabase());

test('booking creates one confirmed reservation, ticket, payment, and audit event', async () => {
  const flight = mockDb.flights.find(f => f.flight_id === 15)!;
  const seat = mockDb.seats.find(s => s.aircraft_id === flight.aircraft_id && !mockDb.tickets.some(t => t.flight_id === flight.flight_id && t.seat_id === s.seat_id && t.status === 'active'))!;
  const booking = await createBooking({ passenger_id: 1, flight_id: flight.flight_id, seat_id: seat.seat_id, method: 'card' });
  assert.equal(booking.status, 'confirmed');
  assert.ok(mockDb.tickets.some(t => t.booking_id === booking.booking_id && t.status === 'active'));
  assert.ok(mockDb.payments.some(p => p.booking_id === booking.booking_id && p.status === 'succeeded'));
  assert.ok(mockDb.audit_log.some(a => a.table_name === 'bookings' && a.record_id === booking.booking_id));
});

test('a seat cannot be booked twice on one flight', async () => {
  const flight = mockDb.flights.find(f => f.flight_id === 15)!;
  const seat = mockDb.seats.find(s => s.aircraft_id === flight.aircraft_id && !mockDb.tickets.some(t => t.flight_id === flight.flight_id && t.seat_id === s.seat_id && t.status === 'active'))!;
  await createBooking({ passenger_id: 1, flight_id: flight.flight_id, seat_id: seat.seat_id, method: 'card' });
  await assert.rejects(createBooking({ passenger_id: 2, flight_id: flight.flight_id, seat_id: seat.seat_id, method: 'card' }), /booked that seat/);
});

test('cancellation voids the ticket, refunds payment, and frees the seat', async () => {
  const flight = mockDb.flights.find(f => f.flight_id === 15)!;
  const seat = mockDb.seats.find(s => s.aircraft_id === flight.aircraft_id && !mockDb.tickets.some(t => t.flight_id === flight.flight_id && t.seat_id === s.seat_id && t.status === 'active'))!;
  const booking = await createBooking({ passenger_id: 1, flight_id: flight.flight_id, seat_id: seat.seat_id, method: 'card' });
  await cancelBooking(booking.booking_id);
  assert.equal(mockDb.bookings.find(b => b.booking_id === booking.booking_id)?.status, 'cancelled');
  assert.equal(mockDb.tickets.find(t => t.booking_id === booking.booking_id)?.status, 'void');
  assert.equal(mockDb.payments.find(p => p.booking_id === booking.booking_id)?.status, 'refunded');
  assert.ok(!mockDb.tickets.some(t => t.flight_id === flight.flight_id && t.seat_id === seat.seat_id && t.status === 'active'));
});

test('flight status updates maintain actual timestamps and audit history', async () => {
  await changeFlightStatus(15, 'in_air');
  const updated = mockDb.flights.find(f => f.flight_id === 15)!;
  assert.equal(updated.status, 'in_air');
  assert.ok(updated.actual_departure_at);
  assert.ok(mockDb.audit_log.some(a => a.table_name === 'flights' && a.record_id === 15));
});

test('new flight accepts crew assignment and persists an audit record', async () => {
  const start = new Date(Date.now() + 1000 * 60 * 60 * 24 * 200);
  const end = new Date(start.getTime() + 5 * 60 * 60 * 1000);
  const flight = await createFlight({ airline_id: 1, aircraft_id: 1, flight_number: 'AA999', origin_airport_id: 1, destination_airport_id: 2, departure_gate_id: 1, arrival_gate_id: 4, departure_at: start.toISOString(), arrival_at: end.toISOString() });
  await assignCrew(flight.flight_id, 1);
  assert.ok(mockDb.flight_crew.some(c => c.flight_id === flight.flight_id && c.crew_member_id === 1));
  assert.ok(mockDb.audit_log.some(a => a.table_name === 'flight_crew' && a.record_id === flight.flight_id));
});
