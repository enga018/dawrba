# Reports Page – Final Specification (DawrBa)

## Purpose
The Reports page provides a complete business overview with performance, risk, efficiency, and historical record metrics.

This is the production-ready v1 design.

---

# Final Layout Order

1. Reports Header
2. Key Performance Cards
3. Collection Performance
4. This Month Highlights
5. All-Time Records
6. Customer Insights
7. Risk Overview
8. Export Report

---

# 1. Reports Header

Layout:
```
Reports                    [This Month] [Download]
Business performance overview
```

### Elements
- Page title
- Period badge (This Month)
- Download icon/button
- Subtitle

---

# 2. Key Performance Cards

## Mobile Layout
2 × 2 grid

## Cards

| Card | Color |
|---|---|
| Collection Rate | Green |
| Outstanding | Red |
| Outstanding Change | Green |
| Overdue % | Purple |

### Example
```
Collection Rate    74.2%
Outstanding        ₹33,300
Outstanding Change -₹4,200
Overdue %          44%
```

---

# 3. Collection Performance

Show:
- Total Credit
- Total Collected
- Average Collection Time

### Example
```
Total Credit            ₹1,29,300
Total Collected         ₹96,000
Average Collection Time 18 days
```

---

# 4. This Month Highlights

Show:
- Largest Credit
- Largest Collection
- Net Recovery

### Example
```
Largest Credit      ₹12,000
Largest Collection  ₹10,000
Net Recovery        +₹18,400
```

### Color Rules
- Positive recovery: Green
- Negative recovery: Red

---

# 5. All-Time Records

Show:
- Largest Credit Ever
- Largest Collection Ever
- Highest Outstanding Customer

### Example
```
Largest Credit Ever        ₹18,500
Largest Collection Ever    ₹22,000
Highest Outstanding        ₹15,200
```

---

# 6. Customer Insights

Show:
- Top Debtor
- Most Payments
- Fully Settled This Month

### Example
```
Top Debtor               Ravi Stores
Most Payments            Ba neitupa
Fully Settled This Month 8 customers
```

---

# 7. Risk Overview

Show:
- Overdue Customers
- Due Today
- Overdue Amount

### Example
```
Overdue Customers  6
Due Today          3
Overdue Amount     ₹14,700
```

### Color Rules
- Overdue Amount: Red
- Due Today: Orange

---

# 8. Export Report

Buttons:
- Export PDF
- Export Excel

### Button Style
- White background
- Green icon
- Radius: 16px
- Height: 48px

---

# Metrics Added (Final)

The final Reports page includes three additional high-value metrics:

1. Outstanding Change
2. Overdue Percentage
3. Average Collection Time

These provide:
- Performance tracking
- Risk measurement
- Collection efficiency insights

---

# What Was Removed

## Not Included
- Weekly comparison
- Weekly reports
- Daily report tables
- Complex charts
- Profit &amp; loss calculations
- Accounting statements
- Aging bucket analysis
- Predictive analytics

---

# Responsive Behavior

## Mobile (&lt;768px)
- 2 × 2 KPI grid
- Single-column sections
- Full-width export buttons

## Tablet (768px–1023px)
- 2 × 2 KPI grid
- Wider content spacing

## Desktop (1024px+)
- 4 KPI cards in one row
- Centered content
- Max width: 1200px

---

# Final Business Model

```
Dashboard = Today Operations
Reports   = This Month Performance + All-Time Records
```

---

# Official Production-Ready Sections

✔ Collection Rate
✔ Outstanding
✔ Outstanding Change
✔ Overdue %
✔ Total Credit
✔ Total Collected
✔ Average Collection Time
✔ This Month Highlights
✔ All-Time Records
✔ Customer Insights
✔ Risk Overview
✔ Export Report

---

# Final Decision

This specification is the official production-ready Reports Page design for DawrBa v1.

It provides:
- Performance metrics
- Risk metrics
- Efficiency metrics
- Historical records
- Customer insights

while remaining simple enough for a small business owner to understand quickly.
