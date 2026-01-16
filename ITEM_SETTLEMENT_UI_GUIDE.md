# Item-Specific Settlement UI Guide

## UI Components Overview

### 1. Settlement Details Dialog - Expense Row (UPDATED)

Each expense row now includes a "Settle This Item" button:

```
┌─────────────────────────────────────────────────────────────┐
│ [📁] Groceries                          Total: ₹500.00      │
│      Food & Groceries                                        │
│      Paid by Tirthankar                                      │
│      Jan 15, 2026                                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Arpan's Share:                        +₹250.00      │    │
│  │ (Red entry - increases debt)                        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  [📄 Settle This Item]                                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Button appears on EVERY expense row
- Visible to BOTH debtor and creditor
- Located below the share display section
- Shows Receipt icon (📄) for easy identification

### 2. Payment Confirmation Modal (NEW)

When "Settle This Item" is clicked, this modal appears:

```
┌─────────────────────────────────────────────────────────────┐
│  Confirm Payment                                       ✕    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Settling share for:                                 │    │
│  │ Groceries                                           │    │
│  │                                                     │    │
│  │ Arpan → Tirthankar                                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Payment Type                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ○ Full Settlement                                   │    │
│  │   Pay the complete share: ₹250.00                   │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ● Partial Payment                                   │    │
│  │   Pay a custom amount                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  Amount                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ₹ [150.00]                                          │    │
│  └─────────────────────────────────────────────────────┘    │
│  Maximum: ₹250.00                                           │
│                                                               │
│  [Cancel]                          [Confirm Payment]        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Context Section**: Shows item name and payment direction
- **Payment Type**: Radio buttons for Full or Partial
- **Amount Field**: 
  - Disabled for Full Settlement (auto-filled)
  - Editable for Partial Payment
  - Validation shows maximum allowed
- **Responsive Design**: Works on mobile and desktop

### 3. Payment Type Interaction Flow

#### Full Settlement Selected:
```
○ Full Settlement
  Pay the complete share: ₹250.00

Amount: ₹ [250.00]  ← DISABLED (grayed out)
Maximum: ₹250.00
```

#### Partial Payment Selected:
```
● Partial Payment
  Pay a custom amount

Amount: ₹ [___]  ← EDITABLE
Maximum: ₹250.00
```

### 4. Success Toast Notification

After confirming payment:
```
┌─────────────────────────────────────┐
│ ✓ Item Settled!                     │
│   Settlement of ₹150.00 recorded    │
│   for Groceries.                    │
└─────────────────────────────────────┘
```

## Visual Location in App

### Navigation Path:
1. **Settle Page** (`/settle`)
2. Click debt card for any user pair
3. Click **"View Details"** button
4. Scroll to any expense in the transaction ledger
5. Click **"Settle This Item"** button on that expense
6. **Payment Confirmation Modal** appears

### Button Placement:
```
Expense Row Structure:
┌─────────────────────────────────────┐
│ Header (Item name, category, date)  │
│ Payment info                         │
├─────────────────────────────────────┤
│ Share Display (colored box)          │
│   - Red: Debt increase               │
│   - Green: Debt decrease             │
│   - Blue: Mixed payment              │
├─────────────────────────────────────┤
│ [📄 Settle This Item]  ← NEW BUTTON │
└─────────────────────────────────────┘
```

## Responsive Design

### Mobile View:
- Modal uses 95vw width (fills most of screen)
- Stack radio buttons vertically
- Full-width buttons in footer
- Large touch targets for buttons

### Desktop View:
- Modal max-width: 500px
- Radio buttons in comfortable vertical list
- Side-by-side buttons in footer
- Hover effects on interactive elements

## Color Coding

- **Primary Button**: Blue/Accent color for "Confirm Payment"
- **Context Box**: Light accent background with border
- **Radio Selected**: Primary color indicator
- **Amount Field**: Standard input with currency symbol
- **Error State**: Red text for validation errors

## Accessibility

- **ARIA Labels**: All interactive elements labeled
- **Keyboard Navigation**: Tab through all controls
- **Screen Reader Support**: Proper semantic HTML
- **Focus Indicators**: Visible focus states
- **Error Messages**: Clear validation feedback

## User Experience Notes

1. **Discoverability**: Button appears on all relevant expenses
2. **Clarity**: Modal shows exactly what's being settled
3. **Flexibility**: Users can pay full or partial amounts
4. **Feedback**: Success toast confirms the action
5. **Safety**: Validation prevents invalid amounts
6. **Accessibility**: Works for both parties equally
