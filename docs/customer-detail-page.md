# Customer Detail Page – DawrBa

## Purpose
The Customer Detail Page provides a complete overview of a customer’s balance, transaction history, payment activity, and quick actions.

The design follows the official DawrBa color system and mobile-first layout.

---

## Page Structure

1. Customer Header
2. Summary Cards
3. Quick Actions
4. Transaction History
5. Recent Activity

---

## 1. Customer Header

### Layout
```
[Avatar]  Customer Name        [Status Badge]
          Phone Number
```

### Elements
- Avatar / Initials
- Customer name
- Phone number
- Status badge

### Status Colors
| Status | Color |
|--------|--------|
| All Clear | Green |
| Due Soon | Yellow |
| Due Today | Orange |
| Overdue | Red |

---

## 2. Summary Cards

### Mobile Layout
- 2 × 2 grid

### Desktop Layout
- 4 columns in a single row

### Cards

| Card | Value Color | Meaning |
|------|-------------|---------|
| Current Balance | Red | Outstanding amount |
| Total Credit | Dark Gray | Total credit given |
| Last Payment | Dark Gray | Most recent payment |
| Total Paid | Green | Total amount received |

### Example
```
Current Balance: ₹2,500
Total Credit:   ₹24,100
Last Payment:   ₹900
Total Paid:     ₹21,600
```

---

## 3. Quick Actions

| Action | Background | Icon/Text Color |
|--------|------------|-----------------|
| Add Credit | Light Red | Red |
| Collect | Light Green | Green |
| Remind | Light Blue | Blue |

### Card Height
Quick action cards must use the official token height:
```
92px
```

---

## 4. Transaction History

### Filter Tabs
- All
- Credit
- Payment

### Transaction Row Structure
```
[Icon]  Title
        Date · Time
                    Amount
```

### Colors
| Type | Icon | Amount |
|------|------|--------|
| Credit | Red Plus | Red |
| Payment | Green Check | Green |
| Edit | Blue Edit | Blue |

### Example
```
Credit added
12 Jul 2026 · 1:26 PM
+₹2,500
```

---

## 5. Recent Activity

### Header
```
Recent Activity              View all
```

### Activity Types
| Activity | Color |
|----------|-------|
| Credit given | Red |
| Payment received | Green |
| Transaction edited | Blue |
| Reminder sent | Blue |
| Customer deleted | Red |

### Note
Keep only the **View all** link in the header.
Do not add a duplicate **See more** button.

---

## Responsive Behavior

### Mobile (&lt;768px)
- 2 × 2 summary grid
- 3 quick action cards
- Single-column transaction list
- Bottom navigation visible

### Tablet (768px–1023px)
- 2 × 2 summary grid
- Larger action cards
- Bottom navigation remains visible

### Desktop (1024px+)
- 4 summary cards in one row
- Sidebar navigation
- Max content width: 1200px

---

## Final Design Decisions

### Keep
- Blue brand header
- Red current balance
- Green total paid
- Transaction filter tabs
- View all link in Recent Activity
- Bottom navigation on tablet

### Improve
- Add timestamps everywhere
- Use consistent currency format (`₹2,500`)
- Align amounts using tabular numbers
- Maintain consistent spacing

### Remove
- Duplicate “See more” button in Recent Activity

---

## Final Layout Order

```
Customer Header
Summary Cards
Quick Actions
Transaction History
Recent Activity
```

This specification is fully aligned with the DawrBa design system and serves as the official reference for implementing the Customer Detail Page.