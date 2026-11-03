-- Run after schema.sql and seed_data.sql in psql. The function validates the seat and
-- writes booking, ticket, and payment in the same transaction.

BEGIN;
SET LOCAL TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT book_ticket(
    (SELECT passenger_id FROM passengers WHERE email='alex.chen@example.com'),
    (SELECT flight_id FROM flights WHERE flight_number='AA101'),
    (SELECT seat_id FROM get_available_seats(
        (SELECT flight_id FROM flights WHERE flight_number='AA101')) LIMIT 1),
    'card',
    (SELECT staff_id FROM users_staff WHERE email='agent@ams.example')
) AS new_booking_id;
-- Inspect the inserted rows before committing, if desired.
SELECT b.booking_reference, b.status, t.seat_id, t.fare, p.status AS payment_status
FROM bookings b JOIN tickets t USING (booking_id)
JOIN payments p USING (booking_id)
WHERE b.passenger_id=(SELECT passenger_id FROM passengers WHERE email='alex.chen@example.com')
ORDER BY b.booked_at DESC LIMIT 1;
COMMIT;

-- If any statement raises an error, issue ROLLBACK instead of COMMIT.
-- Concurrent book_ticket calls serialize on the flight row; the partial unique index
-- on active (flight_id, seat_id) tickets remains the final double-booking guard.

-- Cancellation is also transactional. This cancels the most recently created AA101
-- booking for the sample passenger (the booking just created above).
BEGIN;
SELECT set_config('app.staff_id',
    (SELECT staff_id::text FROM users_staff WHERE email='agent@ams.example'), true);
DO $$
DECLARE v_booking_id BIGINT;
BEGIN
    SELECT b.booking_id INTO v_booking_id
    FROM bookings b JOIN passengers p USING (passenger_id)
    JOIN flights f USING (flight_id)
    WHERE p.email='alex.chen@example.com' AND f.flight_number='AA101'
      AND b.status='confirmed'
    ORDER BY b.booked_at DESC LIMIT 1;
    IF v_booking_id IS NOT NULL THEN PERFORM cancel_booking(v_booking_id); END IF;
END $$;
COMMIT;
