-- Example read queries (PostgreSQL 15+)

-- 1. Upcoming schedule with carrier and route.
SELECT * FROM upcoming_flights ORDER BY departure_at LIMIT 20;

-- 2. Seats and occupancy for every flight (JOIN + GROUP BY).
SELECT f.flight_number, v.total_seats, v.booked_seats, v.available_seats,
       round(100.0 * v.booked_seats / NULLIF(v.total_seats, 0), 1) AS occupancy_pct
FROM flights f JOIN available_seats_per_flight v USING (flight_id)
ORDER BY occupancy_pct DESC;

-- 3. Most frequently flown routes (GROUP BY / HAVING).
SELECT o.iata_code AS origin, d.iata_code AS destination, count(*) AS flights
FROM flights f JOIN airports o ON o.airport_id=f.origin_airport_id
JOIN airports d ON d.airport_id=f.destination_airport_id
GROUP BY o.iata_code, d.iata_code HAVING count(*) >= 1
ORDER BY flights DESC, origin;

-- 4. Top-spending passengers, net of refunds.
SELECT p.passenger_id, p.first_name, p.last_name,
       sum(CASE WHEN pay.status='succeeded' THEN pay.amount
                WHEN pay.status='refunded' THEN -pay.amount ELSE 0 END) AS net_spend
FROM passengers p JOIN bookings b USING (passenger_id)
JOIN payments pay USING (booking_id)
GROUP BY p.passenger_id ORDER BY net_spend DESC LIMIT 10;

-- 5. Net revenue by carrier (view).
SELECT iata_code, name, gross_revenue, refunds, net_revenue
FROM airline_revenue_summary ORDER BY net_revenue DESC;

-- 6. Crew roster for each flight (M:N JOIN).
SELECT f.flight_number, c.full_name, fc.assignment_role
FROM flights f JOIN flight_crew fc USING (flight_id)
JOIN crew_members c USING (crew_member_id)
ORDER BY f.departure_at, fc.assignment_role;

-- 7. Delayed flights grouped by airline (includes airlines with none).
SELECT a.iata_code, a.name, count(f.flight_id) FILTER (WHERE f.status='delayed') AS delayed_flights
FROM airlines a LEFT JOIN flights f ON f.airline_id=a.airline_id
GROUP BY a.airline_id ORDER BY delayed_flights DESC;

-- 8. Passengers who have booked at least two flights (HAVING).
SELECT p.passenger_id, p.first_name, p.last_name, count(*) AS booking_count
FROM passengers p JOIN bookings b USING (passenger_id)
WHERE b.status='confirmed'
GROUP BY p.passenger_id HAVING count(*) >= 2
ORDER BY booking_count DESC;

-- 9. Flights above the average active seat occupancy (scalar subquery).
SELECT f.flight_number, v.booked_seats, v.total_seats,
       round(100.0*v.booked_seats/NULLIF(v.total_seats,0),1) AS occupancy_pct
FROM flights f JOIN available_seats_per_flight v USING (flight_id)
WHERE v.booked_seats::NUMERIC/NULLIF(v.total_seats,0) >
      (SELECT avg(booked_seats::NUMERIC/NULLIF(total_seats,0)) FROM available_seats_per_flight);

-- 10. Itinerary for one passenger (replace email as needed).
SELECT * FROM passenger_itinerary
WHERE passenger_id=(SELECT passenger_id FROM passengers WHERE email='alex.chen@example.com')
ORDER BY departure_at;

-- 11. CTE: rank flights by occupancy within each airline.
WITH occupancy AS (
    SELECT f.flight_id, f.airline_id, f.flight_number,
           v.booked_seats::NUMERIC/NULLIF(v.total_seats,0) AS ratio
    FROM flights f JOIN available_seats_per_flight v USING (flight_id)
)
SELECT a.iata_code, o.flight_number, round(100*o.ratio,1) AS occupancy_pct,
       dense_rank() OVER (PARTITION BY o.airline_id ORDER BY o.ratio DESC) AS airline_rank
FROM occupancy o JOIN airlines a USING (airline_id)
ORDER BY a.iata_code, airline_rank;

-- 12. Window function: each passenger's booking sequence and running spend.
SELECT p.email, b.booking_reference, b.booked_at,
       row_number() OVER (PARTITION BY p.passenger_id ORDER BY b.booked_at) AS booking_sequence,
       sum(t.fare) OVER (PARTITION BY p.passenger_id ORDER BY b.booked_at
                         ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_ticket_fare
FROM passengers p JOIN bookings b USING (passenger_id)
JOIN tickets t USING (booking_id)
ORDER BY p.email, booking_sequence;

-- 13. Subquery: aircraft with more than one flight in the schedule.
SELECT registration, model FROM aircraft
WHERE aircraft_id IN (SELECT aircraft_id FROM flights GROUP BY aircraft_id HAVING count(*) > 1);

-- 14. Baggage manifest with passenger, flight and bag status.
SELECT b.tag_number, b.weight_kg, b.status, p.first_name, p.last_name, f.flight_number
FROM baggage b JOIN tickets t USING (ticket_id)
JOIN bookings bk USING (booking_id)
JOIN passengers p USING (passenger_id)
JOIN flights f USING (flight_id)
ORDER BY f.departure_at, b.tag_number;

-- 15. Flights with no active bookings (NOT EXISTS).
SELECT f.flight_id, f.flight_number
FROM flights f
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.flight_id=f.flight_id AND b.status='confirmed');

-- 16. Booking audit history for recent changes (JSONB snapshots).
SELECT audit_id, changed_at, operation, old_values, new_values
FROM audit_log WHERE table_name='bookings' ORDER BY changed_at DESC LIMIT 25;

-- 17. Seat inventory by class for a flight (parameterize :flight_id in psql/client).
SELECT class, count(*) AS seats_in_class,
       count(*) FILTER (WHERE ticket_id IS NULL) AS available
FROM flights f JOIN seats s ON s.aircraft_id=f.aircraft_id
LEFT JOIN tickets t ON t.flight_id=f.flight_id AND t.seat_id=s.seat_id AND t.status='active'
WHERE f.flight_id=1 GROUP BY class ORDER BY class;
