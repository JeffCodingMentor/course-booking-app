# Design Specification: Course Booking Application (Complete Spec)

## 1. Project Overview
This document consolidates and specifies the entire architecture, database schema, business logic, API endpoints, responsive web designs, and test suites for the **Jeff老師暑期班預約系統 (Course Booking Application)**.

The system is designed for students to register and book course dates for a 6-week summer school period, utilizing a 2-person group booking discount scheme, automatic registration prompts, strict validation guards, capacity override controls, and real-time LINE notifications.

### Technology Stack
* **Frontend**: Next.js (App Router, Client Components) with Vanilla CSS (Modern premium design system, warm colors).
* **Backend**: Next.js API Routes.
* **Database**: Upstash Redis. Supports an in-memory database mock fallback during local development.
* **Notifications**: ChatEverywhere LINE Notify API.
* **Testing**: Jest & React Testing Library (Unit & integration tests).

### Environment Variables
The application utilizes the following environment variables for production integrations:
* `ADMIN_PASSWORD`: Security password required to access the teacher admin dashboard (`/admin/dashboard`).
* `CHAT_EVERYWHERE_TOKEN`: Authorization bearer token used to call the ChatEverywhere LINE Notify API.
* Upstash Redis Configuration (If omitted, the server automatically defaults to an in-memory mock database for local development):
  * `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` (Primary connection parameters)
  * `KV_REST_API_URL` & `KV_REST_API_TOKEN` (Alternative/fallback connection parameters)

---

## 2. Database Schema (Upstash Redis)
The database operates on an **ID-centric** architecture. All data relationships are bound via unique, immutable student IDs rather than names.

| Key Type | Key Format | Value Structure | Purpose |
| :--- | :--- | :--- | :--- |
| **Student Profile** (Hash) | `student:{studentId}` | `{ id: string, name: string, birthday: string, parentPhone: string, registeredAt: string }` | Stores the source of truth student profile details. |
| **Lookup Index** (String) | `student_lookup:{name}:{birthday}` | `studentId` (string) | Secondary index to look up a student's ID using Name + Birthday (fast login). |
| **Student Bookings** (Set) | `student_bookings:{studentId}` | Set of dates: `["2026-07-20", "2026-07-21"]` | Tracks dates booked by a specific student. |
| **Booking Slots** (List) | `booking:{date}` | Array of: `{ studentId: string, bookingType: "single" \| "companion", companionId: string \| null, fee: number, bookedAt: string }` | Stores slot bookings per date. A date allows slots up to its capacity. |
| **Registered Names** (Set) | `registered_students` | Set of student names: `["張三", "李四"]` | Quick companion validation cache based on name. |
| **Capacity Overrides** (String) | `capacity:{date}` | Integer (e.g. `3` or `0` for locked) | Stores slot capacity override for a given date. Default capacity is `2`. |

---

## 3. Core Features & Business Logic

### 3.1 Login & Auto-Registration
* **Login Form**: Simplified to only ask for **學生中文姓名 (Student Chinese Name)** and **生日 (Birthday YYYYMMDD)**.
* **Login Validation**: The backend queries `student_lookup:{name}:{birthday}` to find the matching `studentId`, then retrieves `student:{studentId}`.
* **Auto-Registration Dialog**: If no match is found, the registration confirmation modal (`showRegConfirm`) is shown.
  * The modal displays: *"系統中尚未有「XXX」的註冊資料。請填寫家長聯絡電話完成註冊："* with an input field for the **家長電話 (Parent Phone)**.
  * Clicking "確認註冊" triggers registration. It creates the student profile, registers the lookup index, adds the student name to `registered_students` set, and logs them in.
  * Upon successful registration, the "說明" (Instructions) modal is automatically popped up to guide the user. Subsequent normal logins do not trigger this popup.

### 3.2 Student Profile & Phone Update
* **Centered Layout**: The student page's main title `"Jeff老師暑期班預約系統"` and the profile stats bar are centered to provide a clean, symmetric premium look. In contrast, the Admin Dashboard title and layout remain left-aligned.
* Once logged in, the student status bar displays:
  * Student Name (歡迎，**姓名**)
  * Parent Phone (家長電話：**09xxxxxxxx** [修改])
  * Booking Days Count (預約天數：**X 天**)
* **Parent Phone Self-Update**: Clicking the `[修改]` button prompts the user for a new phone number, which is saved via `POST /api/auth/update-phone`. This updates the profile in the database and updates the UI/localStorage state dynamically.

### 3.3 The 6-Week Weekday Calendar (2026/07/20 to 2026/08/28)
* Covers **6 weeks** (30 weekdays total, Monday to Friday).
* **Week Number Offset**: Weeks are numbered starting from **W3** (Week 3) on 7/20 through **W8** (Week 8) on 8/24 to align with the overall class schedule.
* **Price Suppression**: No price values are displayed on the user interface.
* **Slot Capacity States**:
  * **Remaining Capacity >= 1**: Clickable. Displays `"空位 X"`.
  * **Remaining Capacity = 0**: Disabled. Displays `"額滿"` in red.
  * **Booked by User**: Highlighted with a green border (`border-color: var(--accent-emerald)`) and a light green background tint. Displays `"上課"` (or `"與 [Companion] 上課"`) and a **[取消]** button.
  * **Selected Cell State**: Clicked date cells are highlighted with an orange border (`border-color: var(--accent-indigo)` at 2px width) and a warm orange background tint (`background: rgba(249, 115, 22, 0.08)`).
* **Date Hover Highlight**: Moving the mouse over a clickable date cell (which has `.selectable-cell` class) shows a smooth transition highlighting the border in indigo and adding a subtle card shadow.

### 3.4 Default Locked Week (2026/08/03 ~ 2026/08/07)
* The week of **2026/08/03 to 2026/08/07** has a default capacity of `0` slots.
* It displays as **"額滿"** in red by default.
* Like any other date, this week can be overridden and unlocked/modified by the teacher in the Admin Dashboard (by setting capacity > 0), which dynamically allows student booking.

### 3.5 2-Person Group Booking (兩人同行)
* Enabled via a checkbox. Requires typing a companion's name.
* **Inline Validation**:
  * If the input is empty: Displays `未輸入名字，無法預約` in red.
  * If the companion is not found in `registered_students` set: Displays `XXX未註冊，無法預約` in red.
  * If verified: Displays `已確認` in green and applies a 10% discount ($2,700 per class instead of $3,000).
* **Booking Lock**: Calendar date selection is disabled until the companion's name is successfully verified.
* **Slot Constraints**: Requires selected dates to have at least 2 free slots. Books/Cancels both slots simultaneously.

### 3.6 Submitting States & Anti-Double-Submission
* When confirming booking or canceling slots, both confirmation and cancel buttons are disabled, showing a `處理中...` loading indicator to prevent double submissions.
* The cancellation confirmation modal stays open during API call execution and only closes once the calendar data is refreshed from the database.

---

## 4. Teacher Admin Dashboard (`/admin`)
An isolated back-office module allowing Jeff老師 to log in and manage the system.

### 4.1 Authentication & Session Guarding
* Guarded by a password entry form at `/admin`.
* Authenticates via `POST /api/admin/login` using `ADMIN_PASSWORD` env variable. Writes `admin_session` to cookies/localStorage. All `/api/admin/*` endpoints require authentication.

### 4.2 Calendar Override & Capacity Management
* Renders the 6-week weekday calendar with capacity bars and lists of booked students.
* **Lock/Unlock**: Teachers can adjust capacity overrides (`POST /api/admin/capacity`) to lock dates (capacity = 0) or override slots (e.g. increase to 3).
* **Manual Actions**: Can click "手動新增預約" or "取消預約" next to any student's name.

### 4.3 Student Roster & Tuition Ledger
* **Student List**: Returns all registered students along with class counts and detailed tuition totals.
* **Ledger Drawer**: Expands to show details per student:
  * List of booked dates, booking type (單人 $3,000 / 兩人同行 $2,700), and tuition totals.
* **Student Edit**: Allows changing name, birthday, and phone number (`POST /api/admin/students/edit`). Handles redirecting lookup index keys safely.
* **Student Delete**: Allows deleting students (`POST /api/admin/students/delete`). Blocked if the student has active bookings.

---

## 5. LINE Notifications (ChatEverywhere)
Dispatched in markdown format via `POST https://v2.chateverywhere.app/api/line/notify`. Automatically bypassed for admin dashboard actions to reduce spam, but fully active for student actions.

* **Booking Message**: Lists students, dates, phone numbers, and group booking status.
* **Cancellation Message**: Lists student, date, phone, and group cancellation status.

---

## 6. API Reference

| Endpoint | Method | Headers/Body | Response | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | `{ name, birthday }` | `{ success: true, user }` | Authenticates student name/birthday. |
| `/api/auth/register` | POST | `{ name, birthday, parentPhone }` | `{ success: true, user }` | Registers student profile and indexes. |
| `/api/auth/update-phone` | POST | `{ parentPhone }` + `x-user-id` | `{ success: true, user }` | Updates student's phone number. |
| `/api/auth/validate-companion`| GET | `?name=XXX` | `{ valid: true \| false }` | Checks if companion name is registered. |
| `/api/booking/slots` | GET | `?date=YYYY-MM-DD` | `{ slots: BookingSlot[], capacity: number }` | Fetches booked slots and capacity. |
| `/api/booking/create` | POST | `{ dates[], isCompanionMode, companionName }` + `x-user-id` | `{ success: true }` | Batch books slots. |
| `/api/booking/cancel` | POST | `{ date }` + `x-user-id` | `{ success: true }` | Cancels slot booking. |
| `/api/admin/login` | POST | `{ password }` | `{ success: true }` | Authenticates admin login. |
| `/api/admin/students` | GET | `admin_session` | `{ success: true, students: [] }` | Fetches roster and tuition details. |
| `/api/admin/students/create` | POST | `{ name, birthday, parentPhone }` + `admin_session` | `{ success: true }` | Registers a student from admin. |
| `/api/admin/students/edit` | POST | `{ studentId, name, birthday, parentPhone }` + `admin_session` | `{ success: true }` | Edits student profile details. |
| `/api/admin/students/delete` | POST | `{ studentId }` + `admin_session` | `{ success: true }` | Deletes a student if no active bookings. |
| `/api/admin/bookings/create` | POST | `{ studentName, dates[], isCompanionMode, companionName }` + `admin_session` | `{ success: true }` | Manually books slots (bypasses notifications). |
| `/api/admin/bookings/cancel` | POST | `{ studentName, date }` + `admin_session` | `{ success: true }` | Manually cancels booking (bypasses notifications). |
| `/api/admin/capacity` | POST | `{ date, capacity }` + `admin_session` | `{ success: true }` | Sets capacity override. |
| `/api/debug/db` | GET | None | JSON Dump of Database | Restored to development only. |

---

## 7. Responsive Web Design (RWD) Specifications
* **Vertical Week Layout (<= 600px)**: The calendar grid collapses into a 1-column list. Displays weekday labels (e.g. `(週一)`) next to display dates, with clear separator lines between weeks.
* **Component Auto-Stacking**: Form elements, tabs, roster list cards, and modal dialog buttons auto-wrap or stack on narrow viewports.

---

## 8. Test Suites Reference
* **Home Page UI Test**: Verifies login screen title, checks that the "說明" button is absent before log in, and checks that the "說明" button is present after log in.
* **Auth Tests**: Covers registration, login, companion validation cache, double-registration prevention, and parent phone self-updating.
* **Booking Tests**: Covers validation rules, slot allocation, limit guards (15 bookings), companion checks, and LINE notification dispatches.
* **Admin Tests**: Covers manual booking/cancelling, capacity overrides, student edits (safe renames), student deletions, and LINE Notify bypass validation.

---

## 9. Appendix A: Enrollment Instructions Text (招生說明文字內容)
The following is the literal text content rendered within the "說明" (Instructions) modal dialog on the student page:

```text
2026暑期Scratch班招生說明
- 課程以遊戲專題、貓咪盃準備為主
- 僅開放下午時段 14:00~17:00
- 同時段最多2位同學
- 每堂特價3000元(原價3600)
- 兩人同行(同一天)9折優惠
- 兩位同學都註冊後再用兩人同行方式選時段才有優惠
- 上課地點、收費方式請見[Im未來官網](https://www.im-coding.com/vacation-camp/programs/1)
- Python課、一對一線上課請先聯絡Jeff老師
```
