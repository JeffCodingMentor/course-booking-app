# Design Specification: Course Registration and 2-Person Group Booking System

## 1. Project Overview
This project is a single-page full-stack web application designed for students to register and book course dates. It features a calendar interface representing a 6-week summer school period, a 2-person group booking discount scheme, automatic registration prompts, strict validation guards (including a booking limit of 15 slots per student and companion validation), a locked "Python" reservation week, and real-time LINE notifications sent via ChatEverywhere API.

### Technology Stack
* **Frontend**: Next.js (App Router, Client Components) with Vanilla CSS (Modern premium design system).
* **Backend**: Next.js API Routes / Server Actions.
* **Database**: Vercel KV (Redis) NoSQL key-value store.
* **Notifications**: ChatEverywhere LINE Notify API.
* **Deployment**: Vercel Serverless.

---

## 2. Database Schema (Vercel KV / Redis)

We organize our Redis keys to achieve optimal $O(1)$ query time for registration checks, companion validation, and booking limits.

### 2.1 Student Records
* **Key**: `student:{name}:{birthday}` (Redis String / JSON)
  * *Purpose*: Stores core student info for registration and login checks.
  * *Schema*:
    ```json
    {
      "name": "張三",
      "birthday": "20180815",
      "parentPhone": "0912345678",
      "registeredAt": "2026-06-07T13:30:00.000Z"
    }
    ```

* **Key**: `registered_students` (Redis Set)
  * *Purpose*: A set containing names of all registered students (e.g., `["張三", "李四"]`).
  * *Why*: Used to check if a companion student is registered using `SISMEMBER registered_students companionName` without needing their birthday.

### 2.2 Booking Records
* **Key**: `booking:{date}` (Redis String / JSON)
  * *Key Format*: `booking:YYYY-MM-DD` (e.g., `booking:2026-07-20`)
  * *Purpose*: Stores booking slots filled on a specific date. A day has a maximum of 2 slots.
  * *Schema*:
    ```json
    [
      {
        "studentName": "張三",
        "parentPhone": "0912345678",
        "bookingType": "single | companion",
        "companionName": "李四 | null",
        "fee": 1800 | 2000,
        "bookedAt": "2026-06-07T13:35:00.000Z"
      }
    ]
    ```

* **Key**: `student_bookings:{studentName}` (Redis Set)
  * *Purpose*: Tracks all dates a specific student is booked for (either as the main booker or the companion).
  * *Why*:
    1. **Total Booking Limit**: Ensures a student has $< 15$ bookings by calling `SCARD student_bookings:{studentName}`.
    2. **Overlapping Booking Check**: Prevents booking the same day twice by calling `SISMEMBER student_bookings:{studentName} {date}`.

---

## 3. Core Features & Business Logic

### 3.1 Login & Auto-Registration
* Users enter **Student Name**, **Birthday (YYYYMMDD)**, and **Parent Phone**.
* The server matches the Name and Birthday against `student:{name}:{birthday}`.
* If a match is found, the user is logged in. The session is persisted in browser cookies or `localStorage` for convenience.
* If no match is found, the frontend displays a confirmation dialog asking: *"This student is not registered yet. Would you like to register now using these details?"*
  * **If Yes**: The app registers the student (writing to `student:{name}:{birthday}` and adding the name to the `registered_students` set) and logs them in.
  * **If No**: Clears the input fields.

### 3.2 The 6-Week Weekday Calendar (2026/07/20 to 2026/08/28)
* The calendar starts on **2026/07/20** and spans **6 weeks**.
* **Only weekdays (Monday to Friday)** are displayed (30 days total).
* Capacity per day is **2 slots**.
* Daily slots are rendered based on remaining capacity:
  * **2 slots left**: Clickable. Shows fee: `$2,000` (or `$1,800` if companion mode is toggled).
  * **1 slot left**: Clickable. Shows fee: `$2,000`. (If companion mode is active, it displays *"Needs 2 slots"* and is disabled).
  * **0 slots left**: Disabled. Shows **"Fully Booked" (已額滿)**.
  * **Booked by Current User**: Displays a distinct highlighted border with the text *"Booked (Self)"* (or *"Booked (with [Companion])"*) along with a red **[Cancel Booking]** button.

### 3.3 Special Exception: Python Class Week
* The week of **2026/08/03 to 2026/08/07** (August 3rd to August 7th, 2026) is reserved for the "Python" class.
* These 5 days are permanently marked as **Fully Booked** in the UI.
* Hovering over these days displays a tooltip/hover box containing the label **"Python"**.
* The API will block any attempts to book these dates.

### 3.4 2-Person Group Booking (兩人同行)
* Once logged in, the user can toggle **"Enable 2-Person Group Booking"** and enter a **"Companion Student Name"**.
* **Verification**: The system checks if the companion exists in `registered_students`.
  * If unregistered: Displays `「[Name] 未註冊」` and **blocks** the booking action. **The main user remains logged in**.
  * If verified: Unlocks booking, applying a **10% discount** ($1800 per student instead of $2000) for both students.
* **Linked Booking**: A companion booking fills **both slots** of a date. It requires the selected date to have 2 slots free.
* **Linked Cancellation**: Canceling a companion booking releases **both slots** and decrements the bookings count for both students. Individual cancellation of a companion booking is blocked.

### 3.5 Booking Limits
* Each student can be booked for a **maximum of 15 dates** total across the 6-week calendar (including bookings where they are the companion).
* Students cannot have overlapping bookings on the same day.

### 3.6 LINE Notification via ChatEverywhere
* After a successful booking, the server sends a markdown formatted message to the administrator via ChatEverywhere's LINE Notify endpoint:
  * **Endpoint**: `POST https://v2.chateverywhere.app/api/line/notify`
  * **Headers**:
    ```http
    Authorization: Bearer <CHAT_EVERYWHERE_TOKEN>
    Content-Type: application/json
    ```
  * **Secret Protection**: The `CHAT_EVERYWHERE_TOKEN` must be stored securely as a Vercel environment variable and **never** hardcoded.
  * **Message Formats**:
    * **Single Booking**:
      ```markdown
      ## 新預約：
      - 學生： {學生姓名}
      - 日期： {日期一(MM/DD)}
      - 電話： {家長電話}
      ```
    * **Companion Booking**:
      ```markdown
      ## 新預約（兩人同行）：
      - 預約人： {主要學生姓名}
      - 同行者： {同行者學生姓名}
      - 日期： {日期一(MM/DD)}
      - 電話： {家長電話}
      ```

---

## 5. API Endpoints

### 5.1 `/api/auth/login` (POST)
* **Body**: `{ name, birthday, parentPhone }`
* **Response**: Returns the user profile if registered, or `not_registered` error.

### 5.2 `/api/auth/register` (POST)
* **Body**: `{ name, birthday, parentPhone }`
* **Response**: Writes record to Redis and returns success status.

### 5.3 `/api/auth/validate-companion` (GET)
* **Query**: `?name=XXX`
* **Response**: `{ valid: true | false }`

### 4.4 `/api/booking/create` (POST)
* **Body**: `{ date, isCompanionMode, companionName }`
* **Logic**: Verifies Python week, checks student's total booking limits (<15), checks overlaps, checks slots capacity, writes slots, and triggers LINE notification.

### 4.5 `/api/booking/cancel` (POST)
* **Body**: `{ date }`
* **Logic**: Cancels the slot(s) for that date and updates student booked dates sets.
