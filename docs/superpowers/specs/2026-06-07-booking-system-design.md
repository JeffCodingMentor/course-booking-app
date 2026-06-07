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
* Users enter **Student Name (學生姓名)**, **Birthday (生日 YYYYMMDD)**, and **Parent Phone (家長電話)**.
* The server matches the Name and Birthday against `student:{name}:{birthday}`.
* If a match is found, the user is logged in. The session is persisted in `localStorage` as `student_session`.
* If no match is found, the frontend displays a confirmation dialog asking: *"系統中查無此學生資料。是否要使用上述填寫的資訊進行註冊？"*
  * **If Yes**: The app registers the student (writing to `student:{name}:{birthday}` and adding the name to the `registered_students` set) and logs them in.
  * **If No**: Clars the confirmation box.

### 3.2 The 6-Week Weekday Calendar (2026/07/20 to 2026/08/28)
* The calendar starts on **2026/07/20** and spans **6 weeks** (30 weekdays total).
* **Price Suppression**: No price values are displayed anywhere in the user interface.
* Daily slots are rendered based on remaining capacity:
  * **2 slots left**: Clickable. Displays **"空位 2"**.
  * **1 slot left**: Clickable. Displays **"空位 1"**. (If companion mode is active, it displays **"空位 1 (兩人同行需 2 個空位)"** and is disabled).
  * **0 slots left**: Disabled. Displays **"額滿"** (with text styled in red).
  * **Booked by Current User**: Displays a distinct highlighted green border with the text **"上課"** (or **"與 [Companion] 上課"**) along with a **[取消]** button.

### 3.3 Special Exception: Python Class Week
* The week of **2026/08/03 to 2026/08/07** is reserved for the "Python" class.
* These 5 days are permanently marked as **"額滿"** in red.
* Hovering over these days displays a tooltip containing the label **"Python"**.
* The API will block any attempts to book these dates.

### 3.4 2-Person Group Booking (兩人同行)
* Toggled via the **"兩人同行 (享 10% 優惠)"** checkbox.
* **Verification**: Checks if the companion exists in `registered_students`.
  * If unregistered: Displays `「[Name] 未註冊」` in red and **blocks** the booking action. **The main user remains logged in**.
  * If verified: Displays **"已確認"** in green and unlocks booking, applying the group booking discount in the database.
* **Linked Booking**: A companion booking fills **both slots** of selected dates. It requires selected dates to have 2 slots free.
* **Linked Cancellation**: Canceling a companion booking releases **both slots** for both students.

### 3.5 Multi-Date Selection & Success Alert
* Users click available cells to toggle selection (highlighted in warm orange).
* A single **「確認預約」** button above the calendar opens a confirmation dialog showing selected dates.
* On confirmation, it books all selected dates, saves to the database, sends a LINE notification, and displays a popup dialog: **「預約成功，等待老師電話聯繫確認」**.

### 3.6 LINE Notification via ChatEverywhere
* Sent as a single aggregated markdown dispatch:
  * **Endpoint**: `POST https://v2.chateverywhere.app/api/line/notify`
  * **Headers**: `Authorization: Bearer <CHAT_EVERYWHERE_TOKEN>`
  * **Message Formats**:
    * **Single Booking**:
      ```markdown
      ## 新預約：
      - 學生： {學生姓名}
      - 日期： {日期一}、{日期二}、...
      - 電話： {家長電話}
      ```
    * **Companion Booking**:
      ```markdown
      ## 新預約（兩人同行）：
      - 預約人： {主要學生姓名}
      - 同行者： {同行者學生姓名}
      - 日期： {日期一}、{日期二}、...
      - 電話： {家長電話}
      ```

---

## 4. RWD (Responsive Web Design)
* **Mobile / Tablet Layouts**:
  * **Dashboard Header**: Stacks stats vertically on narrow viewports.
  * **Companion Controls**: Stacks vertically on screens <= 480px. Input extends to 100% width and status messages wrap nicely below.
  * **Weekly Separators**: Calendar grouped in `.week-group` containers. On desktop, weeks are separated by borders. On mobile (<= 600px), weekdays stack vertically in a 1-column list with horizontal divider lines separating each week, displaying weekday labels (e.g. `(週一)`) next to dates.

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

### 5.4 `/api/booking/slots` (GET)
* **Query**: `?date=YYYY-MM-DD`
* **Response**: `{ slots: BookingSlot[] }`

### 5.5 `/api/booking/create` (POST)
* **Body**: `{ dates: string[], isCompanionMode, companionName }`
* **Logic**: Verifies Python week, checks student's total booking limits (<15), checks overlaps, checks slots capacity, writes slots, and triggers LINE notification.

### 5.6 `/api/booking/cancel` (POST)
* **Body**: `{ date }`
* **Logic**: Cancels the slot(s) for that date (and companion's slot if applicable).

### 5.7 `/api/debug/db` (GET)
* **Environment**: Restricted to non-production (returns 403 Forbidden in production).
* **Response**: Dumps the current MemoryDB's entire store and sets as a JSON object for local verification.
