# Modal Specifications – Final (DawrBa)

## Purpose
This document defines the official behavior and layout for:
- Add Credit
- Collect Payment
- Add Customer

across mobile, tablet, and desktop devices.

---

# Responsive Strategy

| Device | Modal Style |
|---|---|
| Mobile (&lt;768px) | Bottom sheet |
| Tablet (768px–1023px) | Centered dialog |
| Desktop (1024px+) | Centered dialog |

---

# Add Credit Modal

## Mobile
### Use custom keypad

### Layout Order
1. Title
2. Large amount display
3. Customer name pill
4. Note field
5. Balance preview card
6. Custom keypad
7. Add Credit button

### Balance Preview
```
Current Balance   ₹2,500
+ Credit Added    ₹288
------------------------
New Balance       ₹2,788
```

### Rules
- New Balance updates live while typing.
- New Balance color: Red.
- Customer pill uses a soft gray border.

## Tablet/Desktop
### Use normal number input

Fields:
- Amount
- Customer
- Date
- Note
- Balance preview

Buttons:
- Cancel
- Save Credit

---

# Collect Payment Modal

## Mobile
### Use custom keypad

### Layout Order
1. Title
2. Large amount display
3. Outstanding amount
4. Payment method
5. Note field
6. Remaining balance preview
7. Custom keypad
8. Save Collection button

### Remaining Balance Preview
```
Current Balance     ₹8,500
- Amount Collected  ₹5,000
---------------------------
Remaining Balance   ₹3,500
```

### Rules
- Remaining Balance updates live.
- Remaining Balance color: Green.

## Tablet/Desktop
### Use normal number input

Fields:
- Amount
- Date
- Payment method
- Note
- Remaining balance preview

Buttons:
- Cancel
- Save Collection

---

# Add Customer Modal

## Mobile
### Use standard form (no custom keypad)

Fields:
1. Full Name (required)
2. Phone Number
3. Address
4. Initial Credit
5. Note

### Initial Credit Preview
```
Starting Balance  ₹0
+ Initial Credit  ₹500
----------------------
New Balance       ₹500
```

### Rules
- Preview appears only when Initial Credit &gt; 0.
- New Balance color: Red.

## Tablet/Desktop
Use the same standard form with wider spacing.

Buttons:
- Cancel
- Create Customer

---

# Modal Dimensions

## Mobile Bottom Sheet
- Height: 85–90% of screen
- Radius: 24px (top only)
- Background: White
- Backdrop: 40% black overlay
- Dismiss: Swipe down or Cancel

## Tablet/Desktop Dialog
- Width: 480px
- Radius: 24px
- Large shadow
- Centered vertically and horizontally

---

# Color Rules

| Item | Color |
|---|---|
| Add Credit primary button | Blue |
| Collect Payment primary button | Green |
| Add Customer primary button | Blue |
| New Balance | Red |
| Remaining Balance | Green |
| Positive values | Green |
| Negative values | Red |

---

# Typography

| Element | Size |
|---|---|
| Large amount display | 48px |
| Modal title | 28px |
| Section title | 18px |
| Field label | 14px |
| Body text | 16px |
| Helper text | 13px |

---

# Final UX Rules

## Mobile
- Add Credit → Custom keypad
- Collect Payment → Custom keypad
- Add Customer → Standard form

## Tablet/Desktop
- All modals use standard inputs.
- No custom keypad.

---

# Official Production Rules

✔ Add live New Balance preview in Add Credit.
✔ Add live Remaining Balance preview in Collect Payment.
✔ Add Initial Credit preview in Add Customer.
✔ Use custom keypad only on mobile for monetary entry.
✔ Use standard forms on tablet and desktop.

---

# Final Decision

This specification is the official production-ready modal design for DawrBa v1.

It provides:
- Fast mobile money entry
- Clear balance feedback
- Consistent visual hierarchy
- Responsive behavior across all devices
- Professional desktop experience
