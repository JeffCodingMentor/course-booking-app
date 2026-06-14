# Design Specification: Mobile RWD Calendar Layout

This document specifies the design and layout changes required to preserve the 5-column weekday calendar grid in the mobile responsive layout (viewport width <= 600px) for the **Course Booking Application**.

* **Target Page Component**: [page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx)
* **Target Style Sheet**: [globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css)

---

## 1. Objectives & Requirements
* **Preserve Grid Form**: Maintain the 5-column calendar layout (Monday to Friday) on viewport widths <= 600px, instead of collapsing it into a single-column vertical list.
* **Optimize Touch Targets**: Hide the inline `[取消]` (Cancel) buttons inside date cells on mobile viewports. Clicking anywhere inside an active green booked cell will trigger the cancellation modal.
* **Information Abbreviation**: Condense status texts and week headers to prevent text wrapping or overflow in narrow cells (~50px-60px width).

---

## 2. Layout & Typography Modifications

### 2.1 Weekday Column Headers
* Column headers at the top of the calendar will display single characters on mobile: `一`, `二`, `三`, `四`, `五`.
* Implemented by wrapping the prefix `週` inside a `<span>` with class `weekday-prefix`, which will be hidden on mobile:
  ```html
  <div class="grid-header"><span class="weekday-prefix">週</span>一</div>
  ```

### 2.2 Date Cell Status Texts
The text in each cell will switch from a desktop descriptive text to an abbreviated mobile-specific status text:
* **Desktop**: `"空位 X"` $\rightarrow$ **Mobile**: `"空X"` (Green)
* **Desktop**: `"額滿"` $\rightarrow$ **Mobile**: `"滿"` (Red)
* **Desktop**: `"上課"` $\rightarrow$ **Mobile**: `"上課"` (White text, green background)
* **Desktop**: `"與 [同行人] 上課"` $\rightarrow$ **Mobile**: `"同行"` (White text, green background)

---

## 3. Implementation Plan

### 3.1 Component Modifications ([page.tsx](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/page.tsx))
1. Wrap the prefix `"週"` in `grid-headers-wrapper` headers inside `<span className="weekday-prefix">週</span>`.
2. Compute `mobileSlotText` dynamically in the date render loop:
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
3. Update the `.slot-indicator` element to include both desktop and mobile spans:
   ```tsx
   <div className="slot-indicator">
     <span className="desktop-slot-text">{slotText}</span>
     <span className="mobile-slot-text">{mobileSlotText}</span>
   </div>
   ```
4. Update `handleCellClick` to check if `myBooking` is defined:
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

### 3.2 Styling Overrides ([globals.css](file:///D:/Jeff/myStudy/antigravity/summer26/booking-app/app/globals.css))
Update the `@media (max-width: 600px)` media query:
1. **Remove** `.week-group { grid-template-columns: 1fr; }` so that it falls back to `repeat(5, 1fr)`.
2. **Remove** `.grid-headers-wrapper { display: none; }` to keep the column header row visible.
3. Configure responsive display classes:
   ```css
   .weekday-prefix {
     display: none;
   }
   .desktop-slot-text {
     display: none;
   }
   .mobile-slot-text {
     display: block;
   }
   .mobile-weekday {
     display: none;
   }
   ```
4. Hide inline controls and meta text inside mobile cells:
   ```css
   .date-cell .cancel-btn {
     display: none;
   }
   .date-cell .week-label { /* or style selectors mapping W3 text */
     display: none;
   }
   ```
5. Apply compact paddings:
   ```css
   .week-group {
     gap: 0.25rem;
     padding-bottom: 0.5rem;
   }
   .date-cell {
     padding: 0.35rem 0.25rem;
     min-height: 52px;
     font-size: 0.75rem;
     border-radius: 4px;
   }
   ```

---

## 4. Testing Criteria
* **RWD Verification**: Check viewport widths under 600px. Verify that the grid displays 5 columns correctly and does not overflow horizontally.
* **Cancellation Modal**: Verify that clicking a booked green cell on a mobile-sized viewport triggers the cancellation dialog successfully.
* **Header & Cell text**: Verify headers display single characters (`一`, `二`, etc.) and cells display `空X`, `滿`, `上課`, or `同行`.
