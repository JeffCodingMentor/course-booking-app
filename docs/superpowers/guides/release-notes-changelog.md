# Release Notes & Changelog (版本更新與變更記錄)

This changelog records the development history, feature updates, database refactoring milestones, and UX optimizations completed for the **Course Booking Application**.

---

## [v1.3.0] - 2026-06-10 (Premium UX & UI Optimization)

### Added
* **Auto-Popup Instructions Dialog**: The SCRATCH enrollment instructions modal opens automatically upon successful student registration.
* **Phone Number Self-Update**: Added a `[修改]` link next to the parent phone in the client header, enabling students to self-update contact numbers inline.
* **Inline Validation Errors**: Added detailed warning logs next to the companion input field for invalid or unregistered names.
* **Submitting Button Guards**: Buttons disable and display `"處理中..."` during booking confirmation and cancellation requests to prevent double submissions.
* **Interactive Hover Effects**: Clickable calendar cells show smooth indigo borders and subtle drop-shadow transitions on hover.
* **Centered Layouts**: Re-styled the client dashboard title and status bar with a symmetric centered layout.

### Fixed
* Removed non-functional info buttons from the login form to clean up the interface.
* Resolved strict ESLint compiler warnings regarding implicit `any` types in test suites.

---

## [v1.2.0] - 2026-06-09 (ID-Centric Database Refactoring)

### Changed
* **Database Key Refactor**: Transitioned from name-based keys to a robust ID-centric architecture using auto-generated `studentId` keys.
* **Index Mapping**: Added `student_lookup:{name}:{birthday}` to map student credentials to IDs, facilitating fast login.
* **Roster Modification APIs**: Created `/api/admin/students/edit` (redirects lookup indexes securely) and `/api/admin/students/delete` (blocked if student has active bookings).
* **Test Suite Updates**: Migrated [tests/auth.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/auth.test.ts) and [tests/booking.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/booking.test.ts) to authenticate using the `x-user-id` session header.

---

## [v1.1.0] - 2026-06-08 (Teacher Admin Dashboard Control)

### Added
* **Secure Admin Access**: Form-based authentication gate checking against the `ADMIN_PASSWORD` variable.
* **Tuition Ledger Drawer**: Calculated student bookings at $3,000 for single and $2,700 for companion booking rates, providing aggregate calculations.
* **Capacity Overrides**: Allowed custom date limits (`capacity:{date}`) to lock dates (capacity = 0) or override slots.
* **LINE Notify Bypass**: Programmed admin-initiated manual bookings and cancellations to bypass group notifications to prevent spam.

---

## [v1.0.0] - 2026-06-07 (Initial Scaffolding & Booking Core)

### Added
* **Next.js Project Scaffolding**: App Router structure with TypeScript, ESLint, and Jest testing environments.
* **Mock Database Fallback**: Implemented local in-memory simulation for offline development compatibility.
* **6-Week Class Calendar**: Displayed booking slots from July 20 to August 28, defaulting August 3-7 to locked capacity.
* **LINE Notifications**: Markdown alerts sent via ChatEverywhere LINE Notify on student class updates.
