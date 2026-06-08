# Design Specification: ID-Centric Database Refactor (ID 導向資料庫重構)

## 1. Project Overview
To support renaming and deleting student records safely in the **Jeff 老師暑期班預約系統**, we are transitioning the database schema from a **name-centric** structure to an **ID-centric** structure. Using the student's Chinese name as the primary identifier across multiple tables previously introduced high data-inconsistency risks during renames. By introducing a unique, immutable `studentId`, we decouple the student's identity from their name.

---

## 2. Redesigned Schema Map (Vercel KV / Redis)

| Key Type | Key Format | Value Structure | Purpose |
| :--- | :--- | :--- | :--- |
| **Student Profile** (Hash) | `student:{studentId}` | `{ id: string, name: string, birthday: string, parentPhone: string, registeredAt: string }` | Stores the source of truth student profile details. |
| **Lookup Index** (String) | `student_lookup:{name}:{birthday}` | `studentId` (string) | Secondary index to look up a student's ID using Name + Birthday (fast O(1) login). |
| **Student Bookings** (Set) | `student_bookings:{studentId}` | Set of dates: `["2026-07-20", "2026-07-21"]` | Track dates booked by a specific student. |
| **Booking Slots** (List) | `booking:{date}` | Array of: `{ studentId: string, bookingType: "single" \| "companion", companionId: string \| null, fee: number, bookedAt: string }` | Stores the actual slot bookings per date. |
| **Registered Names** (Set) | `registered_students` | Set of student names: `["張三", "李四"]` | Quick companion validation cache based on name. |
| **Capacity Overrides** (String) | `capacity:{date}` | Integer (e.g. `3` or `0` for locked) | Stores slot capacity override for a given date. |

---

## 3. Core API Modifications & Business Logic

### 3.1 Authentication & Registration
* **Login (`POST /api/auth/login`)**:
  1. Read body: `{ name, birthday }`.
  2. Query `student_lookup:{name}:{birthday}` to find the matching `studentId`.
  3. If not found, return `not_registered`.
  4. Fetch the profile `student:{studentId}` and return `{ success: true, user }`.
* **Register (`POST /api/auth/register`)**:
  1. Read body: `{ name, birthday, parentPhone }`.
  2. Query `student_lookup:{name}:{birthday}`. If exists, return `{ success: false, error: 'already_registered' }`.
  3. Generate unique `studentId` using a prefix and timestamp (e.g., `std_k3y7df9s`).
  4. Write student profile to `student:{studentId}` and index to `student_lookup:{name}:{birthday}`.
  5. Add name to `registered_students` set.

### 3.2 Student Booking Creation (`POST /api/booking/create`)
* **Headers**: Uses `x-user-id` to identify the logged-in student (with fallback to checking lookup index by name/birthday if only names are provided for backward compatibility).
* **Companion Validation**:
  * Check if the companion name exists in `registered_students` (via `sismember`).
  * If companion is found, lookup their `companionId` using their name + a search of all student profiles (since birthday isn't entered for companion verification, the server will scan or look up).
* **Write**: Writes `studentId` and `companionId` into the `booking:{date}` array.

### 3.3 Booking Slots Resolution (`GET /api/booking/slots`)
* **Name Resolution**:
  * Reads raw slots from `booking:{date}`.
  * For each slot, dynamically fetches the student name from `student:{studentId}`.
  * If `companionId` is set, dynamically fetches companion name from `student:{companionId}`.
  * Returns resolved output JSON containing `studentName` and `companionName` fields.
  * *Result*: Zero client-side frontend modifications are required on the calendar page, and name changes propagate instantly.

### 3.5 Admin Student Operations (名冊管理)
* **Student List (`GET /api/admin/students`)**:
  * Iterates over all `student:*` keys.
  * Aggregates tuition totals and booking lists by fetching `student_bookings:{studentId}` for each student, resolving slot details.
* **Edit Student (`POST /api/admin/students/edit`)**:
  * Body: `{ studentId, name, birthday, parentPhone }`
  * Logic:
    1. Fetch current profile from `student:{studentId}`.
    2. If `name` or `birthday` changed:
       * Check if the new name + birthday combination already exists for another student (reject if duplicate).
       * Delete old lookup key `student_lookup:{oldName}:{oldBirthday}`.
       * Write new lookup key `student_lookup:{name}:{birthday}` pointing to `studentId`.
       * If name changed, remove `oldName` from `registered_students` and add `name`.
    3. Update the profile `student:{studentId}` with the new values.
* **Delete Student (`POST /api/admin/students/delete`)**:
  * Body: `{ studentId }`
  * Logic:
    1. Check if `student_bookings:{studentId}` has any elements (using `scard`).
    2. If count > 0, reject deletion with error `has_bookings`.
    3. If count === 0, fetch profile to retrieve name/birthday.
    4. Delete `student:{studentId}` and `student_lookup:{name}:{birthday}`.
    5. Remove name from `registered_students`.

---

## 4. Testing Updates
* **Integration Tests**:
  * Update `tests/booking.test.ts` and `tests/admin.test.ts` to mock `x-user-id` headers and use `studentId` parameters where applicable.
  * Add dedicated test cases in `tests/admin.test.ts` verifying that:
    1. Deletion fails if a student has active bookings.
    2. Deletion succeeds if a student has 0 bookings, cleaning up all lookup indexes.
    3. Editing names successfully redirects lookup indexes without breaking historical booking relationships.
