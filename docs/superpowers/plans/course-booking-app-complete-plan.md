# Course Booking Application (Complete Implementation Plan)

This document consolidates and outlines the complete implementation lifecycle, development phases, and validation steps for the **Jeff老師暑期班預約系統 (Course Booking Application)**.

* **Specification Reference**: [course-booking-app-complete-spec.md](file:///D:/Jeff/myStudy/antigravity/summer26/docs/superpowers/specs/course-booking-app-complete-spec.md)
* **Codebase Directory**: [booking-app](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app)

---

## File Structure Map
* [package.json](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/package.json) — Scaffolding configuration and npm dependencies.
* [next.config.js](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/next.config.js) — Next.js runtime configurations.
* [jest.config.js](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/jest.config.js) — Jest test environment mapping.
* [tests/jest.setup.js](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/jest.setup.js) — Testing framework setup.
* [lib/db.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/lib/db.ts) — Upstash Redis connection layer with MemoryDB local fallback.
* [lib/notify.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/lib/notify.ts) — ChatEverywhere LINE Notify integration client.
* [app/layout.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/layout.tsx) — Main App Router root structure.
* [app/globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css) — Modern Premium Vanilla CSS stylesheet.
* [app/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx) — Client application booking single page.
* [app/api/auth/login/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/auth/login/route.ts) — Secondary index ID lookup student login endpoint.
* [app/api/auth/register/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/auth/register/route.ts) — ID-centric student profile generation and register endpoint.
* [app/api/auth/update-phone/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/auth/update-phone/route.ts) — Self-update telephone number endpoint.
* [app/api/auth/validate-companion/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/auth/validate-companion/route.ts) — Validation checker endpoint for group companion.
* [app/api/booking/slots/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/slots/route.ts) — Resolved slot bookings and custom capacity details query endpoint.
* [app/api/booking/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/create/route.ts) — Create single/group bookings endpoint with validation guards.
* [app/api/booking/cancel/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/cancel/route.ts) — Student cancellation endpoint.
* [app/admin/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/admin/page.tsx) — Secure teacher admin dashboard login page.
* [app/admin/dashboard/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/admin/dashboard/page.tsx) — Roster list, capacity editor, manual booking/cancelling dashboard.
* [app/api/admin/login/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/login/route.ts) — Teacher authentication validator endpoint.
* [app/api/admin/students/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/students/route.ts) — Tuition ledger and active student bookings compiler endpoint.
* [app/api/admin/students/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/students/create/route.ts) — Admin-initiated student registration endpoint.
* [app/api/admin/students/edit/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/students/edit/route.ts) — Rename and update student credentials endpoint.
* [app/api/admin/students/delete/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/students/delete/route.ts) — Remove student record endpoint (guarded by active booking checks).
* [app/api/admin/bookings/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/bookings/create/route.ts) — Manual booking endpoint (bypasses LINE Notify alerts).
* [app/api/admin/bookings/cancel/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/bookings/cancel/route.ts) — Manual cancellation endpoint (bypasses LINE Notify alerts).
* [app/api/admin/capacity/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/capacity/route.ts) — Custom slots override editor endpoint.
* [app/api/debug/db/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/debug/db/route.ts) — Memory DB testing dump endpoint (local/dev environment only).
* [tests/db.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/db.test.ts) — Redis MemoryDB driver test suite.
* [tests/notify.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/notify.test.ts) — LINE Notify mock test suite.
* [tests/auth.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/auth.test.ts) — Student register/login/update-phone integration test suite.
* [tests/booking.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/booking.test.ts) — Main slots booking API test suite.
* [tests/admin.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/admin.test.ts) — Teacher control endpoints integration test suite.
* [tests/Home.test.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/Home.test.tsx) — Student client homepage UI React DOM test suite.

---

## Development Milestones

### Phase 1: Project Scaffolding & Core Architecture

This phase implements project workspace initialization, local environment configurations, Upstash database abstraction layers, and external notification interfaces.

#### Task 1: Next.js Project Scaffolding & Setup
- [x] **Step 1**: Initialize Next.js project with TypeScript, App Router, ESLint, and use npm dependencies.
- [x] **Step 2**: Install Jest testing utilities (`jest`, `jest-environment-jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `ts-node`).
- [x] **Step 3**: Configure [jest.config.js](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/jest.config.js) and [tests/jest.setup.js](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/jest.setup.js) to support TS component rendering.
- [x] **Step 4**: Clean default Next.js route elements and globals stylesheet in [app/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx) and [app/globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css).

#### Task 2: Upstash Redis Client with MemoryDB Offline Fallback
- [x] **Step 1**: Install `@vercel/kv` (Upstash compatible) SDK package.
- [x] **Step 2**: Create Upstash/Redis connection helper [lib/db.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/lib/db.ts) implementing fallback logic. If `UPSTASH_REDIS_REST_URL` is undefined, return `MemoryDB` containing simulated string-keys and set methods (`get`, `set`, `del`, `sadd`, `srem`, `sismember`, `smembers`, `scard`, `keys`).
- [x] **Step 3**: Write database driver test suite [tests/db.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/db.test.ts) verifying mock set/string persistence.

#### Task 3: ChatEverywhere LINE Notify Integration Utility
- [x] **Step 1**: Implement markdown message composer in [lib/notify.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/lib/notify.ts) mapping single booking and companion bookings to ChatEverywhere HTTP POST API (`https://v2.chateverywhere.app/api/line/notify`).
- [x] **Step 2**: Write unit tests in [tests/notify.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/notify.test.ts) intercepting fetch calls and verifying markdown formatting output.

---

### Phase 2: Core User Client & Booking APIs

This phase handles student onboarding, calendar state queries, validation constraints, and booking submission/cancellation loops.

#### Task 4: Student Authentication & Auto-Registration APIs
- [x] **Step 1**: Write integration tests in [tests/auth.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/auth.test.ts) covering registration, login, and profile lookups.
- [x] **Step 2**: Implement login API [app/api/auth/login/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/auth/login/route.ts) checking for student record by querying lookup index mapping `student_lookup:{name}:{birthday}` to `studentId`.
- [x] **Step 3**: Implement registration API [app/api/auth/register/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/auth/register/route.ts) which allocates a new unique student ID (`std_xxxxxx`), writes student metadata to `student:{studentId}`, writes name to `registered_students` cache, and records the login lookup index.
- [x] **Step 4**: Implement phone self-update API [app/api/auth/update-phone/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/auth/update-phone/route.ts) resolving user via `x-user-id` header to allow updating telephone numbers.
- [x] **Step 5**: Implement companion verification validator [app/api/auth/validate-companion/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/auth/validate-companion/route.ts) to verify companion name registrations dynamically against `registered_students` set.

#### Task 5: Booking Slots Fetch & Action APIs with Validation Guards
- [x] **Step 1**: Write comprehensive tests in [tests/booking.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/booking.test.ts) covering capacity checks, companion bookings, and limits.
- [x] **Step 2**: Implement slots details query endpoint [app/api/booking/slots/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/slots/route.ts) translating student IDs inside booked slots to their profile name and phone fields for frontend client rendering.
- [x] **Step 3**: Implement booking creation API [app/api/booking/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/create/route.ts) enforcing:
  * Overlap guards (cannot book already-taken dates).
  * Double booking block (cannot submit same dates multiple times in body payload).
  * Booking limit limit of 15 booked days.
  * Companion verification (must find valid companion profile ID, lock slots of size 2, apply 10% discount).
  * LINE notification triggers using ChatEverywhere dispatch.
- [x] **Step 4**: Implement student booking cancel API [app/api/booking/cancel/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/cancel/route.ts) removing student bookings, adjusting slot collections, and triggering LINE cancellation notification alerts.

#### Task 6: Premium Student Single-Page Web Interface
- [x] **Step 1**: Structure the client application page in [app/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx) with login inputs, registration dialogs, instructions modal, companion checkbox fields, 6-week grid, and actions.
- [x] **Step 2**: Apply modern warm styling (indigos, oranges, emeralds) in [app/globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css) with glassmorphism overlays and animations.
- [x] **Step 3**: Create instructions dialog rendering SCRATCH class details and [Im未來官網](https://www.im-coding.com/vacation-camp/programs/1) links.
- [x] **Step 4**: Add React test cases [tests/Home.test.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/Home.test.tsx) evaluating login structures, layout components, and instructions popup button.

---

### Phase 3: Teacher Admin Control Panel

This phase builds the secure management view for the teacher, providing calendar adjustments and financial summary tracking.

#### Task 7: Admin Authentication & Layout Scaffolding
- [x] **Step 1**: Build the admin secure landing gate in [app/admin/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/admin/page.tsx) requesting verification password.
- [x] **Step 2**: Write admin verification login endpoint [app/api/admin/login/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/login/route.ts) checking against `ADMIN_PASSWORD` and returning authorized session token headers.

#### Task 8: Roster & Tuition Ledger Calculations API
- [x] **Step 1**: Write ledger integration tests in [tests/admin.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/admin.test.ts) verifying output list shapes and tuition rate calculations.
- [x] **Step 2**: Implement ledger compiler endpoint [app/api/admin/students/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/students/route.ts) loading all `student:*` profiles, resolving booked slot counts, applying single rate ($3,000) or companion discount rate ($2,700), and aggregating totals per student.

#### Task 9: Capacity Customization & Date Locking
- [x] **Step 1**: Implement custom capacity editor route [app/api/admin/capacity/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/capacity/route.ts) updating capacity overrides `capacity:{date}`.
- [x] **Step 2**: Bind capacity queries to user-facing routes [app/api/booking/slots/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/slots/route.ts) to respect overrides (defaulting to capacity = 2, except Python reserved week defaulting to capacity = 0).

#### Task 10: Admin Manual Booking & Cancellation APIs
- [x] **Step 1**: Implement manual registration route [app/api/admin/students/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/students/create/route.ts).
- [x] **Step 2**: Implement manual booking route [app/api/admin/bookings/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/bookings/create/route.ts) checking capacity, updating slot records, and bypassing LINE notify dispatch.
- [x] **Step 3**: Implement manual cancellation route [app/api/admin/bookings/cancel/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/bookings/cancel/route.ts) cleaning slot logs and bypassing LINE notify dispatch.

#### Task 11: Teacher Admin Dashboard UI Panel
- [x] **Step 1**: Structure teacher panel interface in [app/admin/dashboard/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/admin/dashboard/page.tsx) with tab controls for Calendar Management and Student Ledger.
- [x] **Step 2**: Build interactive calendar cells with inline capacity configuration edits and roster display bars.
- [x] **Step 3**: Embed student list search filters, registration forms, and expandable tuition ledger cards.

---

### Phase 4: Schema Refactoring & UX Premiumization

This phase refactors key-value mapping to an ID-centric structure, adds advanced roster edit/delete capabilities, and finishes premium UX details.

#### Task 12: Database Refactoring to ID-Centric Architecture
- [x] **Step 1**: Convert registration paths to output unique IDs rather than using student names as keys.
- [x] **Step 2**: Replace user session headers (`x-user-name`, `x-user-birthday`, `x-user-phone`) in client calls with unified session token `x-user-id`.
- [x] **Step 3**: Rewrite database lookups across bookings, slot listings, and admin reports to resolve student details from ID.
- [x] **Step 4**: Update testing suites in [tests/auth.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/auth.test.ts), [tests/booking.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/booking.test.ts), and [tests/admin.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/admin.test.ts) to use ID validation methods.

#### Task 13: Admin Roster Edit & Delete Student APIs
- [x] **Step 1**: Implement student edit route [app/api/admin/students/edit/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/students/edit/route.ts) renaming lookup keys and update profiles.
- [x] **Step 2**: Implement student delete route [app/api/admin/students/delete/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/admin/students/delete/route.ts) ensuring deletion is blocked with status `400` if the student has active bookings.

#### Task 14: Premium UI/UX Polishments
- [x] **Step 1**: Center layout structures for the homepage title and statistics bar in [app/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx) and [app/globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css).
- [x] **Step 2**: Apply orange/indigo cell accents for selected dates, green cell indicators for booked dates, and indigo/shadow hover transitions on selectable calendar grid cells.
- [x] **Step 3**: Add companion validation error logs next to the companion input field.
- [x] **Step 4**: Implement submitting states (disabling submit buttons and displaying `處理中...` loading text) on confirm/cancel submissions to protect against double execution.
- [x] **Step 5**: Automatically display SCRATCH instructions dialog on successful new registrations.
- [x] **Step 6**: Add inline parent phone editing forms updating details dynamically in memory/localStorage.

#### Task 15: Responsive Web Design & Mobile Collapse
- [x] **Step 1**: Implement media query styles collapsing 5-column grid structures into a vertical list on screen widths <= 600px, adding weekday labels (e.g. `(週一)`) for easy mobile navigation.
- [x] **Step 2**: Adjust container elements, modal widths, and roster ledger lists to auto-stack on narrow layout screens.

---

## Phase 5: Verification & Quality Gates

This validation layer ensures that the system compiles cleanly and meets all test suite checks.

### Task 16: Test Suite Validation
To run the automated tests, execute from the [booking-app](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app) directory:
```bash
npm test
```
All 6 test suites and 29 test assertions must pass successfully:
* `tests/db.test.ts` (PASS)
* `tests/notify.test.ts` (PASS)
* `tests/auth.test.ts` (PASS)
* `tests/booking.test.ts` (PASS)
* `tests/admin.test.ts` (PASS)
* `tests/Home.test.tsx` (PASS)

### Task 17: ESLint and Production Compile Verification
Verify codebase compliance and production output compilation by running:
```bash
npm run lint
npm run build
```
* **Linting check**: Must complete with no warnings or errors.
* **Production compilation**: Must finish with a successful build and bundle generation.
