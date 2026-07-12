# Customer Detail Page – DawrBa

## Purpose
The Customer Detail Page is the primary screen for managing a single customer. It should allow the shopkeeper to quickly view dues, add new credit, record payments, and review transaction history.

---

## Design Goals
- Mobile-first responsive design
- Fast access to Add Credit and Record Payment
- Clear visibility of current due amount
- Easy transaction history review
- Clean scaling for tablet and desktop

---

## Page Structure

```text
Customer Detail Page
├── Header
│   ├── Back Button
│   ├── Customer Name
│   └── Status Badge
├── Summary Cards
│   ├── Current Due
│   ├── Last Payment
│   ├── Total Credit
│   └── Payments Count
├── Quick Action Buttons
│   ├── Add Credit
│   └── Record Payment
├── Recent Transactions
├── Customer Information
└── Payment Summary
```

---

## Header
| Element | Purpose |
|---|---|
| Back Button | Return to Customers list |
| Customer Name | Primary identifier |
| Status Badge | Active / Inactive |
| Phone Icon | Quick call action |

---

## Summary Cards
| Card | Example |
|---|---|
| Current Due | ₹4,500 |
| Last Payment | ₹1,000 |
| Total Credit | ₹12,000 |
| Payments Count | 8 |

**Priority:** Current Due should be visually emphasized.

---

## Quick Action Buttons
| Button | Action |
|---|---|
| Add Credit | Open Add Credit flow |
| Record Payment | Open Payment flow |

**Mobile:** Full-width stacked buttons

**Tablet/Desktop:** Two-column layout

---

## Recent Transactions
Each transaction item should display:
- Transaction type (Credit / Payment)
- Description
- Amount
- Date
- Color indicator

### Example
```text
[+] Credit Added          +₹2,000
Rice & grocery items      10 Jul 2026

[✓] Payment Received      -₹1,000
Cash payment              05 Jul 2026
```

---

## Customer Information
| Field | Example |
|---|---|
| Phone | +91 98765 43210 |
| Address | Kelsih, Mizoram |
| Joined Date | Jan 2026 |
| Status | Active |

---

## Payment Summary
| Metric | Example |
|---|---|
| Total Due | ₹4,500 |
| Paid This Month | ₹1,000 |
| Average Payment | ₹1,500 |
| On-Time Rate | 92% |

---

## Responsive Layout

### Mobile (<768px)
```text
Header
Summary Cards (2x2)
Add Credit
Record Payment
Recent Transactions
Customer Information
Payment Summary
```

### Tablet (768px–1024px)
```text
Header
Summary Cards (4 columns)
Quick Actions (2 columns)
┌─────────────────┬─────────────────┐
│ Customer Info   │ Transactions    │
│ Payment Summary │                 │
└─────────────────┴─────────────────┘
```

### Desktop (>1024px)
```text
┌──────────────┬──────────────────┬──────────────┐
│ Customer     │ Transactions     │ Quick        │
│ Profile      │                  │ Actions      │
│ Summary      │                  │ Due Summary  │
└──────────────┴──────────────────┴──────────────┘
```

---

## Color Usage
| Element | Color |
|---|---|
| Current Due | Blue |
| Credit Added | Orange |
| Payment Received | Green |
| Warning / Overdue | Yellow |
| Danger / High Due | Red |

---

## Navigation Behavior

### From Customers List
```text
Customers → Customer Detail
```

### From Add Credit
```text
Customer Detail → Add Credit → Customer Detail (updated)
```

### From Record Payment
```text
Customer Detail → Record Payment → Customer Detail (updated)
```

---

## Implementation Notes
- Use reusable card components.
- Keep action buttons fixed-width on desktop.
- Maintain 16px minimum touch targets on mobile.
- Transaction list should support pagination or lazy loading.
- All layouts must be responsive without separate mobile pages.

---

## Final Recommendation
This structure should be the official **Customer Detail Page layout for DawrBa**. It prioritizes the most important shopkeeper actions (**Add Credit** and **Record Payment**) while keeping customer information and transaction history easily accessible on all screen sizes.
