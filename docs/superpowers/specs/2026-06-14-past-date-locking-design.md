# Design Specification: Past & Current Date Booking Locks

This document specifies the design for locking booking and cancellation actions on past and current dates (dates `<= today` in Asia/Taipei timezone) for the student client application.

* **Target Page Component**: [page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx)
* **Target Style Sheet**: [globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css)
* **Target Create Booking API**: [route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/create/route.ts)
* **Target Cancel Booking API**: [route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/cancel/route.ts)

---

## 1. Objectives & Requirements
* **Action Lock**: Prevent students from creating or cancelling class bookings for dates `<= today` (where "today" is evaluated in the Asia/Taipei UTC+8 timezone).
* **Admin Override**: Administrative bookings and cancellations (triggered by the Teacher Dashboard at `/admin`) are exempt from this time lock, allowing retroactive attendance/billing logging.
* **Visual Muting**: Display past/current date cells in a muted, grayed-out state and disable hover animations/clicks. If the user already has a booking on a past date, keep the green theme but fade it out and remove all interactive cancellation overlays.

---

## 2. Dynamic Taipei Date Utility
A helper utility `getTaipeiToday` will be used in both frontend and backend routes to extract the current date in the Taipei timezone:
```typescript
export function getTaipeiToday(): string {
  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}
```

---

## 3. Detailed Component Designs

### 3.1 Backend API Safeguards

#### 3.1.1 Create Booking Endpoint ([api/booking/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/create/route.ts))
Before executing overlap checks and slot capacity validation, evaluate the target dates against the Taipei timezone date:
```typescript
const today = getTaipeiToday();
for (const date of dates) {
  if (date <= today) {
    return NextResponse.json({ success: false, error: 'past_date_locked' }, { status: 400 });
  }
}
```

#### 3.1.2 Cancel Booking Endpoint ([api/booking/cancel/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/cancel/route.ts))
Verify the cancellation target date before removing the slot record:
```typescript
const today = getTaipeiToday();
if (date <= today) {
  return NextResponse.json({ success: false, error: 'past_date_locked' }, { status: 400 });
}
```

### 3.2 Frontend UI Calendar Refactoring ([app/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx))
1. Compute the current date `today = getTaipeiToday()` on load.
2. In the calendar cell loop, determine:
   `const isPast = dateStr <= today;`
3. Modify selectability and cancellation hooks:
   - If `isPast` is true:
     - Set `isSelectable = false` (prevents clicking to book).
     - Render `actionElement = null` (removes the `[取消]` cancel button).
     - Disable the full-cell click handler for cancellation confirmation.
     - Append `past-date` to `cellClass`.

### 3.3 CSS Rules ([globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css))
Define `.past-date` class overlays:
```css
.date-cell.past-date {
  opacity: 0.55;
  cursor: not-allowed !important;
  background: #f5f5f4 !important;
  border-color: #e7e5e4 !important;
  pointer-events: none; /* Disable cell hover transitions and pointer interactions */
}

.date-cell.past-date.my-booking {
  background: rgba(16, 185, 129, 0.04) !important;
  border-color: rgba(16, 185, 129, 0.4) !important;
}
```
*(Note: Because of `pointer-events: none`, we must ensure the main container clicks are handled or that `pointer-events: none` only applies to inner elements if a parent click is desired. Since the cell should be entirely unclickable, setting `pointer-events: none` directly on the outer date cell is perfect).*

---

## 4. Test Verification
Write tests verifying:
* **Creation API**: Blocked for past/current dates.
* **Cancellation API**: Blocked for past/current dates.
* **Student UI**: Checks that dates `<= today` lack cancel buttons, do not respond to clicks, and render with the `past-date` class.
