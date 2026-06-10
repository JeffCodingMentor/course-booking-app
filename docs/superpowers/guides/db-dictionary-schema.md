# Database Dictionary & Schema Reference (資料庫鍵值與格式字典)

This document specifies the **ID-centric Upstash Redis key schema**, value structures, types, and caching rules utilized by the **Course Booking Application**.

---

## 1. Key Schema Dictionary

| Key Format | Redis Type | Value JSON/Structure | Description / Lifecycle |
| :--- | :--- | :--- | :--- |
| **`student:{studentId}`** | Hash/String | `{ id: string, name: string, birthday: string, parentPhone: string, registeredAt: string }` | Source of truth profile for a registered student. Persistent. |
| **`student_lookup:{name}:{birthday}`** | String | `studentId` (string) | Secondary lookup index mapping student names and birthdays to their immutable ID. Persistent. |
| **`student_bookings:{studentId}`** | Set | Members: `YYYY-MM-DD` strings (e.g. `["2026-07-20", "2026-07-22"]`) | Tracks dates booked by a specific student. Checked for limit (max 15) and overlaps. |
| **`booking:{date}`** | String/JSON | Array of `BookingSlot` objects (up to capacity). | Stores bookings per date. Labeled `booking:YYYY-MM-DD` (e.g. `booking:2026-07-20`). |
| **`registered_students`** | Set | Members: student names (e.g. `["張三", "李四"]`) | Cache of registered names. Used for inline companion checks. |
| **`capacity:{date}`** | String/Int | Integer (e.g., `3` or `0`) | Capacity override for a given date. If absent, defaults to 2 (or 0 for locked weeks). |

---

## 2. Object Specifications

### A. Student Profile (`student:{studentId}`)
* **Key Example**: `student:std_k8w9j1a2`
* **JSON Structure**:
  ```json
  {
    "id": "std_k8w9j1a2",
    "name": "張三",
    "birthday": "20180815",
    "parentPhone": "0912345678",
    "registeredAt": "2026-06-10T10:30:00.000Z"
  }
  ```

### B. Booking Slot Array (`booking:{date}`)
* **Key Example**: `booking:2026-07-20`
* **JSON Structure**:
  ```json
  [
    {
      "studentId": "std_k8w9j1a2",
      "bookingType": "companion",
      "companionId": "std_a1b2c3d4",
      "fee": 2700,
      "bookedAt": "2026-06-10T10:35:00.000Z"
    },
    {
      "studentId": "std_a1b2c3d4",
      "bookingType": "companion",
      "companionId": "std_k8w9j1a2",
      "fee": 2700,
      "bookedAt": "2026-06-10T10:35:00.000Z"
    }
  ]
  ```

### C. Capacity Override (`capacity:{date}`)
* **Key Example**: `capacity:2026-08-03`
* **Value**: `1` (overrides default `0` locked capacity for the Python reserved week to allow a single manual/student booking).

---

## 3. Reference Indexes & Caching Guidelines

### Name Registry Cache (`registered_students`)
* To optimize companion name lookup and avoid scanning all `student:*` records, the set `registered_students` cache is updated on:
  * **Registration** (`POST /api/auth/register`): `SADD registered_students name`
  * **Edit Student Profile** (`POST /api/admin/students/edit`): If the student's name is updated, the old name is removed (`SREM`) and the new name is added (`SADD`).
  * **Delete Student Profile** (`POST /api/admin/students/delete`): `SREM registered_students name`

### Lookup Index Redirects
* When a student name or birthday is updated via the teacher admin portal:
  * Old lookup key `student_lookup:{oldName}:{oldBirthday}` is deleted (`DEL`).
  * New lookup key `student_lookup:{newName}:{newBirthday}` is set to point to the student's ID (`SET`).
  * This guarantees that future logins resolve correctly to the same immutable `studentId`.
