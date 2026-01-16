# Item-Specific Settlement Implementation Guide

## Overview
This document outlines the implementation of the item-specific settlement feature that allows both debtors and creditors to settle individual expenses.

## Key Changes

### 1. TypeScript Types (`src/lib/types.ts`)
Updated the `Settlement` type to support item-specific settlements:

```typescript
export type Settlement = {
  id: string;
  type: 'settlement';
  fromId: string;
  toId: string;
  amount: number;
  date: string; // ISO string
  relatedExpenseId?: string; // NEW: Links to specific purchase
  description?: string; // NEW: Description of what was settled
};
```

### 2. Payment Confirmation Modal (`src/components/payment-confirmation-modal.tsx`)
Created a new reusable modal component that provides:
- **Context Display**: Shows the item name being settled
- **Payment Type Selection**: Radio buttons for "Full Settlement" or "Partial Payment"
- **Amount Field**: Auto-fills with the full share amount, editable for partial payments
- **Validation**: Ensures amount is positive and doesn't exceed the share amount
- **User-Friendly UI**: Shows who is paying whom

### 3. Debt Card Updates (`src/components/settle/debt-card.tsx`)
Enhanced the `ViewDebtDialog` component:
- **"Settle This Item" Button**: Added to each expense row, visible to BOTH parties
- **Integrated Modal**: Opens the `PaymentConfirmationModal` when clicked
- **Handler Functions**: 
  - `handleSettleExpenseClick`: Captures expense details and opens modal
  - `handleConfirmPayment`: Creates the settlement with all necessary data
- **Props Update**: Added `onSettleExpense` callback prop

### 4. Settlement Creation Logic (`src/app/(app)/settle/page.tsx`)
Implemented `handleSettleExpense` function:
- Creates a new settlement document in Firestore
- Includes `relatedExpenseId` to link to the specific expense
- Adds `description` field with item name
- Uses proper fromId/toId based on debt relationship
- Shows success toast with details

```typescript
const settlementData: Omit<Settlement, 'id'> = {
  type: "settlement",
  fromId: fromId,  // Debtor
  toId: toId,      // Creditor
  amount: amount,  // From modal
  date: new Date().toISOString(),
  relatedExpenseId: expenseId,  // Links to expense
  description: `Settlement for ${itemName}`,
};
```

### 5. Firebase Security Rules (`firestore.rules`)
Updated rules for bi-directional permissions:

**Before:**
```javascript
function isCreatingValidSettlement() {
  return isSignedIn() && request.resource.data.fromId == request.auth.uid;
}
```

**After:**
```javascript
function isCreatingValidSettlement() {
  return isSignedIn() && (
    request.resource.data.fromId == request.auth.uid ||
    request.resource.data.toId == request.auth.uid
  );
}
```

Similar updates for `isUpdatingValidSettlement()` and the delete rule:
- **Create**: Either debtor OR creditor can create settlements
- **Update**: Either debtor OR creditor can update settlements
- **Delete**: Either debtor OR creditor can delete settlements

## User Flow

### For Debtor (Person who owes):
1. Opens "View Details" on a debt card
2. Sees list of all expenses with shares
3. Clicks "Settle This Item" button on any expense
4. Modal opens showing item name and share amount
5. Chooses "Full Settlement" or "Partial Payment"
6. Confirms payment
7. Settlement is created and debt is reduced

### For Creditor (Person who is owed):
1. Opens "View Details" on a debt card (where they are the creditor)
2. Sees the same list of expenses
3. Can also click "Settle This Item" to record payment received
4. Same modal and confirmation flow
5. Settlement is created with proper directionality

## Benefits

1. **Flexibility**: Users can settle individual items instead of entire debts
2. **Bi-Directional Control**: Both parties can record settlements
3. **Transparency**: Each settlement links to a specific expense
4. **Partial Payments**: Support for paying in installments
5. **Audit Trail**: Description field provides context for each settlement
6. **Backward Compatible**: Existing settlements without `relatedExpenseId` still work

## Testing Recommendations

1. **Two User Accounts**: Test with two different users
2. **Create Shared Expenses**: Add several purchases split between users
3. **Settle from Debtor**: Verify debtor can create settlements
4. **Settle from Creditor**: Verify creditor can create settlements  
5. **Partial Payments**: Test with amounts less than the full share
6. **Full Payments**: Test with the complete share amount
7. **Multiple Settlements**: Create multiple settlements for the same expense
8. **Debt Calculation**: Verify the outstanding debt updates correctly
9. **Transaction History**: Check that settlements appear in the ledger

## Security Considerations

- ✅ Authentication required for all operations
- ✅ Both parties involved in a debt can create/update/delete settlements
- ✅ Users cannot create settlements for debts they're not involved in
- ✅ Amount validation happens client-side and server-side
- ✅ Firestore rules enforce proper permissions

## Future Enhancements

Potential improvements for future iterations:
- Settlement approval workflow (require both parties to confirm)
- Settlement notifications (push notifications when created)
- Settlement history filtering (filter by expense type, date range)
- Bulk settlement (settle multiple items at once)
- Settlement receipts (generate PDF or image receipts)
