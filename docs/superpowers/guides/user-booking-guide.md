# User Step-by-Step Guide (學生前台預約使用手冊)

This user manual outlines the registration, login, profile management, and calendar slot booking procedures for students using the **Course Booking Application**.

---

## 1. Login & Automatic Onboarding

The login interface is designed for simplicity, requiring no pre-existing usernames or passwords.

### Steps to Log In:
1. Navigate to the homepage.
2. Enter the **學生中文姓名 (Student Chinese Name)** and **生日 (Birthday YYYYMMDD)** (e.g., `20180815`).
3. Click **登入 (Login)**.

### Automatic Registration Loop:
* If the entered credentials do not match an existing profile, the system opens the **自動註冊 (Auto-Registration)** prompt:
  > *「系統中尚未有您的註冊資料。請填寫家長聯絡電話完成註冊：」*
* Enter the **家長聯絡電話 (Parent Phone Number)** and click **確認註冊 (Confirm Registration)**.
* **First-Time Welcome**: Upon successful registration, the **課程招生說明 (Course Instructions)** modal automatically opens to brief the student. Subsequent normal logins bypass this popup.

---

## 2. Student Profile & Phone Update

Once logged in, the student's dashboard displays a centered statistics header with profile details:
* **Welcome Message**: Displays the student's registered name.
* **Parent Phone**: Displays the contact number with a `[修改]` (Modify) button.
* **Booking Days**: Displays the total count of successfully booked summer school classes.

### Modifying Parent Phone:
1. Click the `[修改]` link next to your telephone number.
2. Enter the new number in the input field.
3. Click **儲存 (Save)**. The profile is updated dynamically in the database and local session.

---

## 3. The 6-Week Class Calendar (W3 ~ W8)

The system displays a 6-week weekday calendar from **2026/07/20 to 2026/08/28**.
* **Week numbering**: Labeled from **W3 to W8** to align with the academy semester schedule.
* **Pricing**: Fees are hidden from the user interface to keep the display clean.

### Cell Status Indicators:
* **selectable-cell (Clickable)**: Displays `"空位 X"` (where X is the number of remaining spots). Clicking a selectable cell highlights it with an orange border and warm tint.
* **額滿 (Locked/Fully Booked)**: Displays `"額滿"` in red when no spots remain or the date capacity is set to 0 (such as the default locked week of `08/03` to `08/07`).
* **上課 (Booked by User)**: Highlighted with a green border and background. Displays `"上課"` (or `"與 [同行人] 上課"`) and a **[取消]** button.

---

## 4. 兩人同行 (2-Person Group Discount)

Students can book classes together to receive a **10% discount** ($2,700 per class instead of $3,000).

### Rules for Companion Bookings:
1. Select the **兩人同行 (Group Booking)** checkbox.
2. Enter your companion's exact registered **學生中文姓名 (Companion Name)**.
3. The system performs inline validation:
   * *If empty*: Displays `"未輸入名字，無法預約"` in red.
   * *If not registered*: Displays `"XXX未註冊，無法預約"` in red (companions must register an account first).
   * *If registered*: Displays `"已確認"` in green.
4. **Calendar Lock**: The calendar cells remain locked and unclickable until a registered companion is successfully validated.
5. **Class Slots**: Selected dates must have at least 2 free spots. Both slots are booked or cancelled simultaneously.

---

## 5. Booking Limits & Anti-Double-Submission

* **15-Day Booking Limit**: A student profile can book a maximum of **15 dates** total. Submissions exceeding this limit will be blocked.
* **Double Submission Guard**: Clicking "確認送出" or "取消預約" initiates a submitting state where action buttons display `"處理中..."` and are disabled. This prevents accidental duplicate charges or slot overrides.
* **LINE Notifications**: Every successful booking and cancellation sends a real-time Markdown message to the class administration LINE group via LINE Notify.
