# Multi-Person Payment Feature

## Overview
This feature allows expenses to be split when multiple people have paid different amounts for the same item or event. Previously, only one person could be marked as the payer, even if multiple people contributed.

## User Flow

### 1. Adding an Expense

When adding a new expense, users will now see a **Payment Type** selection:

#### Option A: Single Payment (Default)
- One person paid the full amount
- Select who paid from the dropdown
- Works exactly like the existing system
- **Best for**: When one person covered the entire expense

#### Option B: Multiple Payments (New)
- Multiple people paid different amounts
- Enter the amount each person paid
- Total must equal the expense amount
- **Best for**: When people split the bill at payment time (e.g., each paid for their own items, or split between credit cards)

### 2. Split Selection (Both Payment Types)

After selecting the payment type, choose how to split the expense:

#### Equal Split (Default)
- Cost divided equally among all group members
- Everyone shares the burden equally

#### Custom Split
- Select specific members to share the expense
- Cost divided equally only among selected members
- Useful when not everyone participated in the expense

## Examples

### Example 1: Single Payment with Equal Split
**Scenario**: Sarah paid ₹600 for team lunch. Split equally among 3 people.

- Payment Type: Single Payment
- Paid By: Sarah
- Amount: ₹600
- Split: Equal (3 people)
- **Result**: Each person owes Sarah ₹200

### Example 2: Multiple Payments with Equal Split
**Scenario**: Dinner bill was ₹900. John paid ₹500, Emma paid ₹400. Split equally among 3 people.

- Payment Type: Multiple Payments
- John paid: ₹500
- Emma paid: ₹400
- Total: ₹900
- Split: Equal (3 people)
- **Result**: 
  - John is owed: ₹500 - ₹300 = ₹200
  - Emma is owed: ₹400 - ₹300 = ₹100
  - Third person owes: ₹300 (₹200 to John + ₹100 to Emma)

### Example 3: Multiple Payments with Custom Split
**Scenario**: Movie tickets ₹800. Alex paid ₹500, Kim paid ₹300. Only these 2 went to the movie.

- Payment Type: Multiple Payments
- Alex paid: ₹500
- Kim paid: ₹300
- Total: ₹800
- Split: Custom (only Alex and Kim selected)
- **Result**: 
  - Alex is owed: ₹500 - ₹400 = ₹100
  - Kim owes: ₹400 - ₹300 = ₹100

## UI Components

### Payment Type Selector
```
┌─────────────────────────────────────────────────────────┐
│ Payment Type                                            │
│ Choose how the expense was paid                         │
│                                                          │
│ ┌──────────────────────┐  ┌──────────────────────────┐ │
│ │ ○ Single Payment     │  │ ○ Multiple Payments      │ │
│ │ [User Icon]          │  │ [Users Icon]             │ │
│ │ One person paid the  │  │ Multiple people paid     │ │
│ │ full amount          │  │ different amounts        │ │
│ └──────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Multi-Payment Input (when Multiple Payments selected)
```
┌─────────────────────────────────────────────────────────┐
│ Payment Distribution                                    │
│ Enter how much each person paid. Total must equal ₹900 │
│                                                          │
│ ┌──────────────────┐  ┌──────────────────┐            │
│ │ John             │  │ Emma             │            │
│ │ [500.00______]   │  │ [400.00______]   │            │
│ └──────────────────┘  └──────────────────┘            │
│                                                          │
│ ┌──────────────────┐  ┌──────────────────┐            │
│ │ Sarah            │  │ Mike             │            │
│ │ [0.00________]   │  │ [0.00________]   │            │
│ └──────────────────┘  └──────────────────┘            │
│                                                          │
│ ✓ Total paid: ₹900.00 / ₹900.00                        │
└─────────────────────────────────────────────────────────┘
```

## Display in Expense Log

### Single Payer
```
┌────────────────────────────────────────┐
│ [Avatar] John Smith                    │
└────────────────────────────────────────┘
```

### Multiple Payers (2 people)
```
┌────────────────────────────────────────┐
│ [Avatar1][Avatar2] John & Emma         │
└────────────────────────────────────────┘
```

### Multiple Payers (3+ people)
```
┌────────────────────────────────────────┐
│ [A1][A2][A3] 4 people                  │
└────────────────────────────────────────┘
```

## Technical Implementation

### Data Structure
```typescript
type Purchase = {
  id: string;
  type: 'purchase';
  itemName: string;
  category: string;
  date: string;
  amount: number;
  paidById: string;              // For backward compatibility
  splitWith: string[];           // User IDs to split with
  paymentType?: 'single' | 'multiple';  // Optional for backward compatibility
  paidByAmounts?: Record<string, number>; // Map of userId to amount paid
};
```

### Settlement Calculation
The settlement logic has been updated to handle both payment types:

1. **Single Payment**: Original logic - payer is owed their share from each participant
2. **Multiple Payments**: Each payer is owed their share based on what they paid

### Firebase Security Rules
- For single-payer expenses: only the payer can modify
- For multi-payer expenses: any of the payers can modify
- Payment type cannot be changed after creation
- Payer IDs cannot be modified after creation

## Backward Compatibility

✅ **Fully backward compatible**
- Existing single-payer expenses continue to work
- `paymentType` defaults to `'single'` if not specified
- `paidByAmounts` is optional
- No data migration required

## Validation Rules

1. **Total Amount Validation**: For multiple payments, the sum of individual amounts must equal the total expense amount
2. **At Least One Payer**: Must have at least one person with a non-zero payment
3. **Split Validation**: At least one person must be selected for split
4. **Cannot Change Payment Type**: Once an expense is created, its payment type is locked

## Future Enhancements

Potential improvements for future versions:
- Allow unequal split percentages
- Support for partial payments over time
- Payment method tracking (cash, card, UPI, etc.)
- Receipt attachment for multi-payer expenses
- Split by item (different people paid for different items)
