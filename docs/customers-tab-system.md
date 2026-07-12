# Customers Tab System (Approved)

## Purpose
Manage customer balances and provide quick actions for adding credit and collecting payments.

## Layout
1. Page header with customer count
2. Search bar
3. Filter chips (All / Active / Overdue / Settled)
4. Customer cards on mobile
5. Customer table on desktop

## Customer Card Structure
- Avatar
- Customer name
- Phone number
- Status badge
- Outstanding amount
- Last payment / overdue info
- Add Credit button
- Collect button

## Color System
### Page
- Background: `#F4F6F8`
- Card Background: `#FFFFFF`
- Border: `#E5E7EB`

### Status
- Active: `#16A34A`
- Overdue: `#EA580C`
- Settled: `#2563EB`

### Buttons
- Primary: `#2563EB`
- Primary Text: `#FFFFFF`
- Secondary Border: `#E5E7EB`
- Secondary Text: `#2563EB`

## Card Styling
- Radius: `24px`
- Padding: `20px`
- Shadow: `0 8px 24px rgba(15,23,42,0.06)`
- Gap: `16px`

## Typography
- Customer Name: `16px / 700`
- Phone: `14px / 500`
- Outstanding Amount: `28px / 800`
- Label Text: `12px / 600`

## Mobile Rules
- No horizontal scrolling
- Two action buttons per row
- Page padding: `16px`
- Card spacing: `16px`

## Desktop Rules
Use a table with columns:
- Customer
- Phone
- Outstanding
- Status
- Actions

## Currency Rule
Use the `₹` symbol everywhere.

## Approved Interaction
- Tap card → Customer details
- Add Credit button → Open Add Credit flow
- Collect button → Open Collection flow
