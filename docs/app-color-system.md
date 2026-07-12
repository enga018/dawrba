# DawrBa App Color System

## Purpose
This document defines the official color coding system for the entire DawrBa application.

Using a consistent color system ensures that users immediately understand the meaning of actions, balances, payments, reminders, and status indicators across mobile, tablet, desktop, and admin screens.

---

# Core Palette

| Purpose | Color | Hex |
|--------|--------|------|
| Primary / Brand | Blue | `#2563EB` |
| Success / Payment | Green | `#16A34A` |
| Danger / Credit | Red | `#DC2626` |
| Warning / Due Today | Orange | `#EA580C` |
| Pending / Due Soon | Yellow | `#CA8A04` |
| Primary Text | Dark Gray | `#111827` |
| Secondary Text | Gray | `#6B7280` |
| Background | Light Gray | `#F3F4F6` |
| Card Surface | White | `#FFFFFF` |

---

# Global Color Rules

## Blue = Brand & Navigation
Use for:
- App header
- Bottom navigation active state
- Settings
- Reports
- Reminder action
- Edit action
- Links and “View all” buttons

## Green = Money Received / Success
Use for:
- Payment collected
- Total paid
- Success messages
- “All clear” status
- Collect payment button

## Red = Money Given / Outstanding / Delete
Use for:
- Credit added
- Current balance due
- Overdue customers
- Delete customer
- Add credit button

## Orange = Due Today / Warning
Use for:
- Due today alerts
- Warning banners
- Important attention states

## Yellow = Pending / Due Soon
Use for:
- Due in 1–3 days
- Pending actions
- Reminder follow-up states

## Gray = Informational
Use for:
- Secondary text
- Timestamps
- Labels
- Non-critical totals

---

# Feature Color Mapping

| Feature | Color |
|--------|--------|
| Add Credit | Red |
| Credit Amount | Red |
| Collect Payment | Green |
| Payment Amount | Green |
| Reminder | Blue |
| Edit Transaction | Blue |
| Delete Customer | Red |
| Overdue Customer | Red |
| Due Today | Orange |
| Due Soon | Yellow |
| All Clear | Green |

---

# Dashboard Color Logic

## Needs Attention Card

| State | Color |
|------|--------|
| Overdue | Red |
| Due Today | Orange |
| Due Soon | Yellow |
| No Issues | Green |

---

# Final Design Principle

```
Blue   = Brand / Navigation / Information
Green  = Money Received / Success
Red    = Money Given / Outstanding / Delete
Orange = Warning / Due Today
Yellow = Pending / Due Soon
Gray   = Informational / Secondary
```

Following this system across all screens will give DawrBa a consistent fintech-style identity and make the meaning of each color immediately recognizable to users.