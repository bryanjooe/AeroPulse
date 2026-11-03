-- Load after schema.sql. All IDs are resolved by natural keys so seed data can be reloaded.
INSERT INTO airports(iata_code, icao_code, name, city, country, timezone) VALUES
('JFK','KJFK','John F. Kennedy International Airport','New York','United States','America/New_York'),
('LHR','EGLL','Heathrow Airport','London','United Kingdom','Europe/London'),
('SFO','KSFO','San Francisco International Airport','San Francisco','United States','America/Los_Angeles'),
('DXB','OMDB','Dubai International Airport','Dubai','United Arab Emirates','Asia/Dubai'),
('SIN','WSSS','Singapore Changi Airport','Singapore','Singapore','Asia/Singapore');

INSERT INTO airlines(iata_code, name, country) VALUES
('AA','American Airlines','United States'),('BA','British Airways','United Kingdom'),
('EK','Emirates','United Arab Emirates'),('SQ','Singapore Airlines','Singapore');

INSERT INTO aircraft(airline_id, registration, model, manufacturer) VALUES
((SELECT airline_id FROM airlines WHERE iata_code='AA'),'N100AA','Boeing 737-800','Boeing'),
((SELECT airline_id FROM airlines WHERE iata_code='AA'),'N200AA','Boeing 787-9','Boeing'),
((SELECT airline_id FROM airlines WHERE iata_code='BA'),'G-BA01','Airbus A320neo','Airbus'),
((SELECT airline_id FROM airlines WHERE iata_code='BA'),'G-BA02','Boeing 777-300ER','Boeing'),
((SELECT airline_id FROM airlines WHERE iata_code='EK'),'A6-EK01','Airbus A380-800','Airbus'),
((SELECT airline_id FROM airlines WHERE iata_code='EK'),'A6-EK02','Boeing 777-300ER','Boeing'),
((SELECT airline_id FROM airlines WHERE iata_code='SQ'),'9V-SQ01','Airbus A350-900','Airbus'),
((SELECT airline_id FROM airlines WHERE iata_code='SQ'),'9V-SQ02','Boeing 787-10','Boeing');

INSERT INTO terminals(airport_id, terminal_code, name)
SELECT airport_id, 'T1', 'Main Terminal' FROM airports;
INSERT INTO gates(terminal_id, airport_id, gate_code)
SELECT t.terminal_id, t.airport_id, g.gate_code
FROM terminals t CROSS JOIN (VALUES ('A1'),('A2'),('A3')) AS g(gate_code);

INSERT INTO users_staff(email, full_name, role) VALUES
('ops@ams.example','Morgan Chen','operations'),
('agent@ams.example','Riley Patel','agent');

INSERT INTO crew_members(airline_id, employee_number, full_name, job_title) VALUES
((SELECT airline_id FROM airlines WHERE iata_code='AA'),'AA-C001','Jordan Lee','Captain'),
((SELECT airline_id FROM airlines WHERE iata_code='AA'),'AA-C002','Avery Brooks','First Officer'),
((SELECT airline_id FROM airlines WHERE iata_code='AA'),'AA-C003','Casey Morgan','Purser'),
((SELECT airline_id FROM airlines WHERE iata_code='BA'),'BA-C001','Taylor James','Captain'),
((SELECT airline_id FROM airlines WHERE iata_code='BA'),'BA-C002','Alex Taylor','First Officer'),
((SELECT airline_id FROM airlines WHERE iata_code='BA'),'BA-C003','Jamie Clark','Flight Attendant'),
((SELECT airline_id FROM airlines WHERE iata_code='EK'),'EK-C001','Samir Khan','Captain'),
((SELECT airline_id FROM airlines WHERE iata_code='EK'),'EK-C002','Noor Haddad','First Officer'),
((SELECT airline_id FROM airlines WHERE iata_code='EK'),'EK-C003','Layla Rahman','Purser'),
((SELECT airline_id FROM airlines WHERE iata_code='SQ'),'SQ-C001','Wei Ming','Captain'),
((SELECT airline_id FROM airlines WHERE iata_code='SQ'),'SQ-C002','Amara Lim','First Officer'),
((SELECT airline_id FROM airlines WHERE iata_code='SQ'),'SQ-C003','Priya Nair','Flight Attendant');

INSERT INTO passengers(email, first_name, last_name, date_of_birth, passport_number, passport_country) VALUES
('alex.chen@example.com','Alex','Chen','1988-04-12','P1000001','United States'),
('maya.patel@example.com','Maya','Patel','1992-08-03','P1000002','India'),
('oliver.smith@example.com','Oliver','Smith','1984-01-21','P1000003','United Kingdom'),
('sophia.jones@example.com','Sophia','Jones','1995-05-09','P1000004','United States'),
('liam.brown@example.com','Liam','Brown','1979-11-30','P1000005','Canada'),
('emma.wilson@example.com','Emma','Wilson','1990-02-18','P1000006','Australia'),
('noah.davis@example.com','Noah','Davis','1986-07-25','P1000007','United States'),
('ava.miller@example.com','Ava','Miller','1998-09-14','P1000008','United Kingdom'),
('ethan.moore@example.com','Ethan','Moore','1981-12-05','P1000009','United States'),
('isabella.taylor@example.com','Isabella','Taylor','1993-03-27','P1000010','Singapore'),
('lucas.anderson@example.com','Lucas','Anderson','1977-06-11','P1000011','United States'),
('mia.thomas@example.com','Mia','Thomas','1996-10-19','P1000012','India'),
('mason.jackson@example.com','Mason','Jackson','1989-01-08','P1000013','United States'),
('amelia.white@example.com','Amelia','White','1983-04-30','P1000014','United Kingdom'),
('james.harris@example.com','James','Harris','1991-07-17','P1000015','United States'),
('harper.martin@example.com','Harper','Martin','1987-02-22','P1000016','Canada'),
('elijah.thompson@example.com','Elijah','Thompson','1999-12-02','P1000017','United States'),
('evelyn.garcia@example.com','Evelyn','Garcia','1982-08-26','P1000018','Mexico'),
('benjamin.martinez@example.com','Benjamin','Martinez','1994-05-16','P1000019','United States'),
('charlotte.robinson@example.com','Charlotte','Robinson','1985-09-07','P1000020','Singapore');

-- 15 future flight legs across five airports and four carriers.
INSERT INTO flights(airline_id, aircraft_id, flight_number, origin_airport_id, destination_airport_id,
                    departure_gate_id, arrival_gate_id, departure_at, arrival_at)
SELECT al.airline_id, ac.aircraft_id, x.flight_number, o.airport_id, d.airport_id,
       gd.gate_id, ga.gate_id, now() + x.departure_offset::interval,
       now() + x.departure_offset::interval + x.duration::interval
FROM (VALUES
 ('AA','N100AA','AA101','JFK','LHR',2, '3 days','7 hours'),
 ('BA','G-BA02','BA202','LHR','JFK',3, '4 days','7 hours 30 minutes'),
 ('AA','N200AA','AA303','SFO','JFK',4, '5 days','5 hours 30 minutes'),
 ('BA','G-BA01','BA404','LHR','DXB',5, '6 days','7 hours'),
 ('EK','A6-EK01','EK505','DXB','SIN',6, '7 days','7 hours 20 minutes'),
 ('SQ','9V-SQ01','SQ606','SIN','SFO',7, '8 days','15 hours'),
 ('AA','N100AA','AA707','JFK','SFO',8, '9 days','6 hours'),
 ('BA','G-BA02','BA808','LHR','SIN',9, '10 days','13 hours'),
 ('EK','A6-EK02','EK909','DXB','LHR',10, '11 days','7 hours 30 minutes'),
 ('SQ','9V-SQ02','SQ110','SIN','DXB',11, '12 days','7 hours 30 minutes'),
 ('AA','N200AA','AA211','JFK','DXB',13,'13 days','12 hours'),
 ('BA','G-BA01','BA312','LHR','SFO',14,'14 days','11 hours'),
 ('EK','A6-EK01','EK413','DXB','JFK',15,'15 days','14 hours'),
 ('SQ','9V-SQ01','SQ514','SIN','LHR',16,'16 days','14 hours'),
 ('EK','A6-EK02','EK615','DXB','SIN',17,'17 days','7 hours 20 minutes')
) AS x(airline_code, registration, flight_number, origin_code, destination_code, gate_num, departure_offset, duration)
JOIN airlines al ON al.iata_code=x.airline_code
JOIN aircraft ac ON ac.registration=x.registration
JOIN airports o ON o.iata_code=x.origin_code
JOIN airports d ON d.iata_code=x.destination_code
JOIN gates gd ON gd.airport_id=o.airport_id AND gd.gate_code='A' || ((x.gate_num % 3)+1)::text
JOIN gates ga ON ga.airport_id=d.airport_id AND ga.gate_code='A' || (((x.gate_num+1) % 3)+1)::text;

-- 24 physical seats on each sample aircraft: 2 First, 4 Business, 18 Economy.
INSERT INTO seats(aircraft_id, seat_number, class)
SELECT a.aircraft_id, (((n.seat_no + 1) / 2)::text || CASE WHEN n.seat_no % 2 = 1 THEN 'A' ELSE 'B' END),
       CASE WHEN (n.seat_no + 1) / 2 <= 1 THEN 'First'::seat_class
            WHEN (n.seat_no + 1) / 2 <= 3 THEN 'Business'::seat_class ELSE 'Economy'::seat_class END
FROM aircraft a CROSS JOIN generate_series(1,24) AS n(seat_no);

INSERT INTO flight_crew(flight_id, crew_member_id, assignment_role)
SELECT f.flight_id, c.crew_member_id, c.job_title
FROM flights f JOIN crew_members c ON c.airline_id=f.airline_id
WHERE c.job_title IN ('Captain','First Officer','Purser');

-- Exactly 30 paid bookings (two on each of 15 flights), created through business logic.
DO $$
DECLARE f RECORD; v_seat BIGINT; v_passenger BIGINT; v_booking BIGINT; n INTEGER := 0;
BEGIN
    FOR f IN SELECT flight_id, aircraft_id FROM flights ORDER BY departure_at LOOP
        FOR v_seat IN
            SELECT seat_id FROM seats WHERE aircraft_id=f.aircraft_id ORDER BY seat_number LIMIT 2
        LOOP
            n := n + 1;
            SELECT passenger_id INTO v_passenger FROM passengers ORDER BY passenger_id
            OFFSET ((n - 1) % 20) LIMIT 1;
            v_booking := book_ticket(v_passenger, f.flight_id, v_seat, 'card',
                (SELECT staff_id FROM users_staff WHERE email='agent@ams.example'));
        END LOOP;
    END LOOP;
END $$;

INSERT INTO baggage(ticket_id, tag_number, weight_kg, status)
SELECT ticket_id, 'BG-' || lpad(ticket_id::text, 6, '0'), 18.50 + (ticket_id % 8),
       CASE WHEN ticket_id % 3 = 0 THEN 'loaded' ELSE 'checked_in' END
FROM tickets ORDER BY ticket_id LIMIT 12;
