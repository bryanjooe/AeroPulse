# Frontend audit and QA

## Implementation status

| Area | Status | Notes |
| --- | --- | --- |
| Overview dashboard | Ready | KPIs and operational summaries use the local database snapshot. |
| Flights | Ready | Filters, sort/search, CSV, add-flight form, detail page, status updates, crew assignments, passenger manifest. |
| Booking flow | Ready | Multi-step passenger/flight/seat/payment flow; active seats are checked before issue. |
| Bookings | Ready | Search/table, detail view, ticket/payment/baggage summary, cancel/refund flow. |
| Passengers | Ready | Search/table, add/edit form, itinerary detail view. |
| Airports | Partial | Airport creation and editing through the card action; airport/terminal detail is not a standalone route. |
| Airlines and fleet | Partial | Airline/aircraft create/edit forms and aircraft seat generation; detailed carrier/fleet routes are not separate pages. |
| Crew | Partial | Crew creation/editing and assignment conflict validation; assignment controls live on flight details. |
| Baggage | Ready | Baggage status can advance through checked-in, loaded, in-transit, and claimed. |
| Payments | Ready | Search, sorting, column visibility, CSV export, and totals. |
| Staff and roles | Partial | Staff records are editable; demo roles filter navigation and persist, but this is not production authentication. |
| Audit log | Ready | Mutating operations append audit events to the browser database. |
| Data persistence | Ready for demo | `localStorage` persistence is scoped to this browser and can be cleared from browser storage. |
| PostgreSQL connection | Not wired to the UI | The frontend uses `src/api/mock.ts`; connect a REST API to make it use PostgreSQL. |

## Automated checks

Run these from the repository root:

```sh
npm run test:api
npm run build
```

`test:api` covers booking creation, duplicate seat rejection, cancellation/refund, flight status timestamps/audit history, and crew assignment on a new flight. `build` runs strict TypeScript checking and creates the production bundle.

## Manual browser walkthrough

1. Start the app with `npm run dev` and open the Vite URL.
2. On **Flights**, filter by airline/status and search a flight number. Open a row, change its status, then assign an eligible crew member.
3. Open **New booking**, choose a flight and an unoccupied seat, enter passenger/payment details, and complete the booking.
4. Open that booking from **Bookings**. Confirm its ticket/payment details, cancel it, and confirm the status changes to cancelled/refunded.
5. Refresh and verify the booking and audit entry remain. Try to book the same seat again; it should be available after cancellation.
6. Add a passenger, airline, aircraft, crew member, airport, or staff user from the corresponding page. Edit by opening its row/card action; delete an unused record and confirm deletion is blocked when dependent records exist.
7. Use **Ctrl+K** to search for a passenger name, flight number, airport code, or booking reference.
8. Cycle demo roles in the profile menu and confirm restricted navigation redirects to the access page. Toggle light/dark theme and refresh to confirm preferences persist.
9. Use table column visibility, paging, sort, row selection, and CSV export on a list.

## Verification note

On 2026-11-03 the automated API checks passed (5/5) and the production build completed. The in-app browser bridge could not provide a reliable page state in this session, so the manual browser walkthrough above remains to be run in the visible preview. The build reports an existing large JavaScript chunk (~1.09 MB) and upstream Zod annotation warnings; neither blocks the build.
