# Customers Tab – Final Specification (DawrBa)

## Purpose
The Customers tab is the primary customer management screen.
It allows users to:
- Search customers
- Filter by status
- View outstanding balances
- Add credit
- Collect payments
- Open customer details

---

# Final Layout Order

1. Blue App Header
2. Page Title + Customer Count
3. Search Bar
4. Filter Chips
5. Customer Cards List
6. Bottom Navigation

---

# 1. Header

Keep the existing blue DawrBa header.

Example:
```
DawrBa                     Good Evening
                            FS Store 2341
```

---

# 2. Page Title + Count

Layout:
```
Customers              [6 customers]
```

### Count Badge
- Background: #F5F7FB
- Text: #6B7280
- Radius: 16px
- Padding: 8px 14px

---

# 3. Search Bar

Keep the current design.

### Specifications
- Height: 56px
- Radius: 18px
- Background: White
- Placeholder: "Search customers..."
- Left search icon

---

# 4. Filter Chips (UPDATED)

## Final Mobile Sizes
| Property | Value |
|---|---|
| Height | 40px |
| Horizontal Padding | 18px |
| Font Size | 16px |
| Radius | 20px |

## Chips
- All (filled blue)
- Active (green outline)
- Overdue (orange outline)
- Due Today (yellow outline)
- Settled (blue outline)

### Reason
The previous chips were too large and created excessive vertical space.
The new 40px height keeps the interface compact while remaining easy to tap.

---

# 5. Customer Card (FINAL)

## Layout
```
[Avatar] Name                  [Status Badge]
         Phone

₹2,500                         Last: 21h ago

[ Add Credit ]   [ Collect ]
```

---

## Card Specifications
| Property | Value |
|---|---|
| Radius | 24px |
| Padding | 20px |
| Background | White |
| Shadow | Soft |
| Gap Between Cards | 16px |

---

## Avatar
- Size: 44px
- Circular
- Blue background for normal customers
- Yellow background for Due Today
- Red background for Overdue

---

## Amount Colors
| Status | Amount Color |
|---|---|
| Active | Red |
| Due Today | Red |
| Overdue | Red |
| Settled | Green |
| Zero Balance | Green |

### Important
Settled customers must NOT display a red amount.

---

## Status Badge Rules
Show the status ONLY once as a badge.

### Keep
- Due today badge
- Overdue badge
- Settled badge
- Active badge

### Remove
- Duplicate "Due today" text beside the amount
- Duplicate status text elsewhere in the card

---

## Last Activity
Display only:
```
Last: 21h ago
Last: 3h ago
Last: 1d ago
```

This replaces any duplicate due-status text.

---

## Action Buttons
### Add Credit
- Height: 48px
- White background
- Gray border
- Gray text

### Collect
- Height: 48px
- Blue background
- White text

---

# Example – Due Today Card

```
BN  Ba neitupa                [Due today]
    1234567890

₹2,500                        Last: 21h ago

[ Add Credit ]   [ Collect ]
```

---

# Example – Settled Card

```
V   villagecouncil            [Settled]
    9876543210

₹0                            Last: 1d ago

[ Add Credit ]   [ Collect ]
```

Amount color must be GREEN.

---

# Responsive Behavior

## Mobile (&lt;768px)
- 40px filter chips
- Single-column cards
- Bottom navigation visible

## Tablet (768px–1023px)
- 44px filter chips
- Single-column cards
- Bottom navigation visible

## Desktop (1024px+)
- 48px filter chips
- Multi-column customer grid (future enhancement)
- Sidebar navigation (future enhancement)

---

# Final Decisions

## Keep
- Current search bar
- Current customer card layout
- Current action buttons
- Current customer count badge
- Current bottom navigation

## Change
- Reduce filter chip height to 40px on mobile
- Change settled amount color to green
- Remove duplicate "Due today" text
- Keep only the status badge + last activity text

## Remove
- Repeated status labels inside the card

---

# Final Production-Ready Rules

A customer card must contain:
- Avatar
- Name
- Phone number
- One status badge
- Outstanding amount
- Last activity text
- Add Credit button
- Collect button

No status should appear more than once.

This is the official production-ready specification for the DawrBa Customers tab.