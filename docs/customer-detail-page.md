# Customer Detail Page – DawrBa

## Purpose
The Customer Detail Page provides a complete overview of a single customer, including outstanding balance, payment history, quick actions, and recent activity.

This page is designed to be mobile-first while remaining responsive on tablet and desktop.

---

# Page Structure

1. Customer Header
2. Summary Cards
3. Quick Actions
4. Transaction History
5. Recent Activity

---

# Customer Header

## Layout
```
[Avatar]  Customer Name        [Status Badge]
          Phone Number
```

## Elements
- Avatar / Initials
- Customer name
- Phone number
- Status badge

## Status Colors
| Status | Color |
|--------|--------|
| All Clear | Green |
| Due Soon | Yellow |
| Due Today | Orange |
| Overdue | Red |

---

# Summary Cards

## Mobile Layout
2 × 2 grid

## Desktop Layout
4 columns in a single row

## Cards

| Card | Value Color | Meaning |
|------|-------------|---------|
| Current Balance | Red | Outstanding amount |
| Total Credit | Dark Gray | Total credit given |
| Last Payment | Dark Gray | Most recent payment |
| Total Paid | Green | Total amount received |

---

# Quick Actions

| Action | Background | Icon/Text Color |
|--------|------------|-----------------|
| Add Credit | Light Red | Red |
| Collect | Light Green | Green |
| Remind | Light Blue | Blue |

---

# Transaction History

## Filter Tabs
- All
- Credit
- Payment

## Transaction Row Structure
```
[Icon]  Title
        Date · Time
                    Amount
```

## Colors
| Type | Icon | Amount |
|------|------|--------|
| Credit | Red Plus | Red |
| Payment | Green Check | Green |
| Edit | Blue Edit | Blue |

---

# Recent Activity

## Header
```
Recent Activity              View all
```

## Activity Types
| Activity | Color |
|----------|-------|
| Credit given | Red |
| Payment received | Green |
| Transaction edited | Blue |
| Reminder sent | Blue |
| Customer deleted | Red |

---

# Responsive Behavior

## Mobile (<768px)
- 2 × 2 summary grid
- 3 quick action cards
- Single-column transaction list

## Tablet (768px–1023px)
- 2 × 2 summary grid
- Larger action cards

## Desktop (1024px+)
- 4 summary cards in one row
- Sidebar navigation
- Max content width: 1200px

---

# Final Layout Order

```
Customer Header
Summary Cards
Quick Actions
Transaction History
Recent Activity
```

This structure provides the best balance of visibility, usability, and financial clarity for DawrBa users.