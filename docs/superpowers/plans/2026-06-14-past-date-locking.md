# Past & Current Date Booking Locks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement server-side API guards and client-side UI overrides to prevent students from booking or cancelling dates on or before today (in the Asia/Taipei timezone).

**Architecture:** Create a shared date helper utility for Taipei time, integrate date validation checks in booking creation/cancellation API routes, and apply CSS disabled overlays on the student page calendar.

**Tech Stack:** Next.js, TypeScript, Vanilla CSS, Jest.

---

## File Structure Map
* [lib/date.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/lib/date.ts) — Create a new file containing the shared Taipei timezone date calculator.
* [api/booking/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/create/route.ts) — Modify to reject booking creation for dates `<= today`.
* [api/booking/cancel/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/cancel/route.ts) — Modify to reject booking cancellations for dates `<= today`.
* [app/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx) — Modify to disable selectability, hide cancel button, disable cell click, and append `past-date` style class for past/current dates.
* [app/globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css) — Add `.past-date` styling rules to grey out cells on mobile and desktop viewports.
* [tests/booking.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/booking.test.ts) — Add unit and integration tests verifying time locks.

---

## Tasks

### Task 1: Create Timezone Date Utility

**Files:**
* Create: [lib/date.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/lib/date.ts)

- [ ] **Step 1: Write the getTaipeiToday helper**
  Write to `booking-app/lib/date.ts`:
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

- [ ] **Step 2: Commit utility file**
  ```bash
  git add booking-app/lib/date.ts
  git commit -m "feat: add Taipei timezone today date utility"
  ```

---

### Task 2: Implement Backend API Guards

**Files:**
* Modify: [api/booking/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/create/route.ts)
* Modify: [api/booking/cancel/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/cancel/route.ts)

- [ ] **Step 1: Add time lock check to Booking Create API**
  Import `getTaipeiToday` and add checks to [api/booking/create/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/create/route.ts) around line 256 (before limit checks):
  ```typescript
  // Import:
  // import { getTaipeiToday } from '@/lib/date';
  
  const today = getTaipeiToday();
  for (const date of dates) {
    if (date <= today) {
      return NextResponse.json({ success: false, error: 'past_date_locked' }, { status: 400 });
    }
  }
  ```

- [ ] **Step 2: Add time lock check to Booking Cancel API**
  Import `getTaipeiToday` and add check to [api/booking/cancel/route.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/api/booking/cancel/route.ts) around line 416 (before fetching slot indices):
  ```typescript
  // Import:
  // import { getTaipeiToday } from '@/lib/date';
  
  const today = getTaipeiToday();
  if (date <= today) {
    return NextResponse.json({ success: false, error: 'past_date_locked' }, { status: 400 });
  }
  ```

- [ ] **Step 3: Run npm run build to check compilation**
  Run: `npm run build`
  Expected: Successful compilation.

- [ ] **Step 4: Commit API changes**
  ```bash
  git add booking-app/app/api/booking/
  git commit -m "feat(api): enforce time locks in booking create and cancel endpoints for past/current dates"
  ```

---

### Task 3: Enforce UI Locks & Apply CSS Styles

**Files:**
* Modify: [app/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx)
* Modify: [app/globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css)

- [ ] **Step 1: Import getTaipeiToday and restrict cell properties on load**
  Modify [app/page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx):
  - Import `getTaipeiToday` from `@/lib/date`.
  - Inside the weeks/days render mapping loop (around line 570), compute:
    `const isPast = dateStr <= getTaipeiToday();`
  - Modify `isSelectable` computation to block if `isPast` is true:
    `const isSelectable = !isPast && !myBooking && capacity > 0 && (isCompanionMode ? (isCompanionVerified && remaining >= 2) : (remaining >= 1));`
  - Wrap the booked cancellation `actionElement` rendering to check `!isPast`:
    ```tsx
    if (myBooking) {
      cellClass += ' my-booking';
      const companionText =
        myBooking.bookingType === 'companion' && myBooking.companionName
          ? `與 ${myBooking.companionName} `
          : '';
      slotText = `${companionText}上課`;
      if (!isPast) {
        actionElement = (
          <button 
            className="cancel-btn" 
            onClick={(e) => {
              e.stopPropagation();
              setCancelTargetDate(dateStr);
              setShowCancelConfirm(true);
            }}
          >
            取消
          </button>
        );
      }
    }
    ```
  - Append `past-date` class string if `isPast` is true:
    ```tsx
    if (isPast) {
      cellClass += ' past-date';
    }
    ```
  - Update `handleCellClick` to check `!isPast`:
    ```tsx
    const handleCellClick = () => {
      if (isPast) return; // Ignore clicks on past dates
      if (isSelectable) {
        toggleDateSelection(dateStr);
      } else if (myBooking) {
        setCancelTargetDate(dateStr);
        setShowCancelConfirm(true);
      }
    };
    ```
  - Set cursor style based on `isPast`:
    ```tsx
    style={{ cursor: (!isPast && (isSelectable || myBooking)) ? 'pointer' : 'default' }}
    ```

- [ ] **Step 2: Add CSS rules for past-date class**
  Add styles to [app/globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css) (at the bottom of the main section, e.g. around line 240):
  ```css
  .date-cell.past-date {
    opacity: 0.55;
    cursor: not-allowed !important;
    background: #f5f5f4 !important;
    border-color: #e7e5e4 !important;
    pointer-events: none;
  }

  .date-cell.past-date.my-booking {
    background: rgba(16, 185, 129, 0.04) !important;
    border-color: rgba(16, 185, 129, 0.4) !important;
  }
  ```

- [ ] **Step 3: Run npm run build in booking-app**
  Run: `npm run build`
  Expected: Successful compilation.

- [ ] **Step 4: Commit UI changes**
  ```bash
  git add booking-app/app/page.tsx booking-app/app/globals.css
  git commit -m "feat(ui): display past dates as gray/disabled and block click-to-cancel handlers"
  ```

---

### Task 4: Automated Testing Verification

**Files:**
* Modify: [tests/booking.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/booking.test.ts)

- [ ] **Step 1: Write integration tests for past date validation guards**
  Add test assertions in [tests/booking.test.ts](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/tests/booking.test.ts) (such as testing `/api/booking/create` and `/api/booking/cancel` with mock past dates <= today to verify they return status `400` and error `past_date_locked`).
  Ensure the mock test environment dates align correctly.

- [ ] **Step 2: Run Jest test suite**
  Run: `npm test`
  Expected: All 29+ tests pass successfully.

- [ ] **Step 3: Run ESLint check**
  Run: `npm run lint`
  Expected: Completes with zero errors or warnings.

- [ ] **Step 4: Commit and Push**
  ```bash
  git add booking-app/tests/booking.test.ts
  git commit -m "test: add integration test suite verifying past date booking and cancel blocks"
  git push origin feature/redesign-booking-ui
  ```
