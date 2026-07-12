# Dashboard Insights Feed – DawrBa

## Purpose
The Insights Feed replaces the old Summary Feed.

It should display important business insights, records, milestones, and alerts that are not obvious from the Recent Transactions list.

---

# Dashboard Placement

The Insights Feed appears:

1. Blue Hero Card
2. Today Stats
3. Insights Feed
4. Recent Transactions

---

# What the Insights Feed Contains

## 1. Monthly Record (Dashboard)
Display only monthly records on the dashboard.

### Example
```
🏆 New monthly record
Ravi Stores received a ₹12,000 credit
Highest single credit transaction this month
```

### Triggers
- Largest single credit this month
- Largest single collection this month

---

## 2. Net Recovery Insight
### Example
```
📈 Strong recovery day
Collected ₹5,000 • Credit given ₹2,000
Net recovery: +₹3,000
```

### Trigger
When collected today is greater than credit given today.

---

## 3. Overdue Alert
### Example
```
⚠️ Attention needed
3 customers became overdue today
Total overdue amount: ₹8,400
```

### Triggers
- New overdue customers
- Overdue amount increased significantly

---

## 4. Achievement
### Example
```
✅ Milestone reached
Outstanding dropped below ₹50,000
for the first time this month.
```

### Triggers
- Outstanding reduced below a target
- Recovery goal achieved
- Significant reduction in outstanding

---

## 5. Top Performer
### Example
```
⭐ Top collector today
Ba neitupa paid ₹10,000
Largest collection of the day.
```

### Triggers
- Largest payment today
- Customer fully settled

---

# What NOT to Show

The following belong in Recent Transactions, not Insights:
- Added credit ₹500
- Collected ₹300
- Edited transaction
- Deleted transaction
- Every small activity

---

# Dashboard vs Reports

## Dashboard (This Month Only)
Use monthly records and current business insights.

### Show
- New monthly credit record
- New monthly collection record
- Net recovery insights
- Overdue alerts
- Achievements
- Top performer today

### Do NOT Show
- All-time records
- Historical record tables

---

## Reports (All Time)
Use historical business records.

### Example
```
Largest credit ever: ₹18,500
Customer: Aman Traders
Date: 14 Feb 2026
```

---

# Maximum Items
The dashboard should show:

```
Maximum 3 insight cards at a time.
```

Priority order:
1. Overdue Alert
2. New Monthly Record
3. Net Recovery Insight
4. Achievement
5. Top Performer

If more than three insights exist, show the highest-priority three.

---

# Insight Card Design

## Card Style
- White background
- Radius: 24px
- Padding: 20px
- Soft shadow

## Icons
| Type | Icon Color |
|------|-------------|
| Record | Orange |
| Recovery | Green |
| Alert | Red |
| Achievement | Blue |
| Performer | Purple |

---

# Final Decision

## Dashboard
Use monthly insights only.

## Reports
Use all-time records and historical analytics.

This keeps the dashboard engaging and current while preserving long-term business records in the Reports page.

---

# Official Rule

Dashboard Insights Feed = This Month + Current Business Alerts

Reports Records = All-Time Historical Records
