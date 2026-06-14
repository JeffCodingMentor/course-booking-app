# Mobile RWD Calendar Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the 5-column weekday grid layout on mobile viewports while compressing cell texts and using full-cell clicks for cancellation confirmation.

**Architecture:** Render both desktop and mobile status texts in the page DOM and toggle their visibility via CSS media queries. Remove the 1-column flex wrap fallback on mobile grid viewports and shrink date cell spacing dynamically.

**Tech Stack:** Next.js (TypeScript, React App Router), Vanilla CSS, Jest.

---

## File Structure Map
* [page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx) — Modify column header rendering, date cell text rendering, and cellular click handler.
* [globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css) — Update RWD media queries to preserve 5-column grid and toggle display of abbreviations.

---

## Tasks

### Task 1: Component HTML and Interaction Refactoring

**Files:**
* Modify: [page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx#L559-L655)

- [ ] **Step 1: Update column headers layout**
  Modify [page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx#L559-L565) to wrap the prefix "週" inside a span with `weekday-prefix` class:
  ```tsx
  <div className="grid-headers-wrapper">
    <div className="grid-header"><span className="weekday-prefix">週</span>一</div>
    <div className="grid-header"><span className="weekday-prefix">週</span>二</div>
    <div className="grid-header"><span className="weekday-prefix">週</span>三</div>
    <div className="grid-header"><span className="weekday-prefix">週</span>四</div>
    <div className="grid-header"><span className="weekday-prefix">週</span>五</div>
  </div>
  ```

- [ ] **Step 2: Add dynamic mobile status text computation**
  Modify [page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx#L590-L620) to compute `mobileSlotText` dynamically inside the date mapping loop:
  ```tsx
  let mobileSlotText = '';
  if (myBooking) {
    mobileSlotText = myBooking.bookingType === 'companion' ? '同行' : '上課';
  } else if (capacity === 0 || slots.length >= capacity) {
    mobileSlotText = '滿';
  } else if (isCompanionMode && remaining < 2) {
    mobileSlotText = '滿';
  } else {
    mobileSlotText = `空${remaining}`;
  }
  ```

- [ ] **Step 3: Modify date cell render to output both desktop and mobile elements**
  Modify [page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx#L650) to structure responsive texts inside `.slot-indicator`:
  ```tsx
  <div className="slot-indicator">
    <span className="desktop-slot-text">{slotText}</span>
    <span className="mobile-slot-text">{mobileSlotText}</span>
  </div>
  ```

- [ ] **Step 4: Update handleCellClick to support full-cell cancel dialog on mobile**
  Modify [page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx#L629-L633) to trigger cancel confirmation if cell is booked:
  ```tsx
  const handleCellClick = () => {
    if (isSelectable) {
      toggleDateSelection(dateStr);
    } else if (myBooking) {
      setCancelTargetDate(dateStr);
      setShowCancelConfirm(true);
    }
  };
  ```

- [ ] **Step 5: Run npm run build in booking-app to check for TypeScript compile correctness**
  Run: `npm run build`
  Expected: Successful compilation without errors.

- [ ] **Step 6: Commit changes**
  ```bash
  git add booking-app/app/page.tsx
  git commit -m "feat(ui): refactor page.tsx to support responsive mobile slot text and click-to-cancel target"
  ```

---

### Task 2: Styles Overrides for Mobile Viewports

**Files:**
* Modify: [globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css#L458-L506)

- [ ] **Step 1: Refactor CSS media queries for viewport width <= 600px**
  Replace lines 458-506 of [globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css) with:
  ```css
  @media (max-width: 600px) {
    .app-container {
      padding: 1rem 0.5rem;
    }

    .login-card {
      margin: 3rem 1rem;
      padding: 1.5rem;
    }

    .calendar-section {
      padding: 0.75rem 0.5rem;
    }

    .calendar-header-bar {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }

    .calendar-header-bar button {
      width: 100% !important;
    }

    .weekday-prefix {
      display: none;
    }

    .week-group {
      gap: 0.35rem;
      padding-bottom: 0.75rem;
    }

    .date-cell {
      padding: 0.5rem 0.25rem;
      min-height: 60px;
      font-size: 0.75rem;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.25rem;
    }

    .date-cell .date-number {
      font-size: 0.75rem;
    }

    .date-cell .cancel-btn {
      display: none;
    }

    .desktop-slot-text {
      display: none;
    }

    .mobile-slot-text {
      display: block;
      font-weight: bold;
    }

    .mobile-weekday {
      display: none;
    }

    .slot-indicator {
      margin: 0;
      font-size: 0.7rem;
    }
  }
  ```

- [ ] **Step 2: Add styles for mobile-slot-text to the desktop section of the stylesheet**
  Add `.mobile-slot-text { display: none; }` to the main section of [globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css) (e.g. around line 180) to hide it by default on desktop:
  ```css
  .mobile-slot-text {
    display: none;
  }
  ```

- [ ] **Step 3: Run npm run build in booking-app to verify compilation**
  Run: `npm run build`
  Expected: Successful compilation.

- [ ] **Step 4: Commit changes**
  ```bash
  git add booking-app/app/globals.css
  git commit -m "style(ui): update media query overrides to retain 5-column calendar grid on mobile viewports"
  ```

---

### Task 3: Test Verification & Cleanup

**Files:**
* Verify: Entire repository.

- [ ] **Step 1: Run Jest test suite**
  Run: `npm test`
  Expected: All 29 tests pass successfully.

- [ ] **Step 2: Run ESLint check**
  Run: `npm run lint`
  Expected: Completes with zero errors or warnings.

- [ ] **Step 3: Final commit and push**
  ```bash
  git push origin feature/redesign-booking-ui
  ```
