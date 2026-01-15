# Multi-Payment Feature Examples

This document provides detailed examples of how the multi-payment feature handles different scenarios.

## Test Scenario 1: Single Payment with Equal Split (Backward Compatible)

### Input
```javascript
{
  type: 'purchase',
  itemName: 'Team Lunch',
  amount: 600,
  paymentType: 'single',
  paidById: 'user1',  // Sarah
  splitWith: ['user1', 'user2', 'user3'],  // Sarah, John, Emma
}
```

### Calculation
- Total: ₹600
- Share per person: ₹600 / 3 = ₹200
- Sarah paid: ₹600
- Sarah's share: ₹200
- Sarah is owed: ₹600 - ₹200 = ₹400

### Result
```
John owes Sarah: ₹200
Emma owes Sarah: ₹200
```

---

## Test Scenario 2: Multiple Payments with Equal Split

### Input
```javascript
{
  type: 'purchase',
  itemName: 'Dinner at Restaurant',
  amount: 900,
  paymentType: 'multiple',
  paidById: 'user1',  // First payer (for compatibility)
  paidByAmounts: {
    'user1': 500,  // John paid ₹500
    'user2': 400,  // Emma paid ₹400
  },
  splitWith: ['user1', 'user2', 'user3'],  // John, Emma, Sarah
}
```

### Calculation
- Total: ₹900
- Share per person: ₹900 / 3 = ₹300
- John paid: ₹500, owes: ₹300, is owed: ₹200
- Emma paid: ₹400, owes: ₹300, is owed: ₹100
- Sarah paid: ₹0, owes: ₹300

### Result
```
John is owed: ₹200
Emma is owed: ₹100
Sarah owes: ₹300 (₹200 to John, ₹100 to Emma)
```

---

## Test Scenario 3: Multiple Payments with Custom Split

### Input
```javascript
{
  type: 'purchase',
  itemName: 'Movie Tickets',
  amount: 800,
  paymentType: 'multiple',
  paidById: 'user1',  // First payer (for compatibility)
  paidByAmounts: {
    'user1': 500,  // Alex paid ₹500
    'user2': 300,  // Kim paid ₹300
  },
  splitWith: ['user1', 'user2'],  // Only Alex and Kim (custom split)
}
```

### Calculation
- Total: ₹800
- Share per person: ₹800 / 2 = ₹400
- Alex paid: ₹500, owes: ₹400, is owed: ₹100
- Kim paid: ₹300, owes: ₹400, owes: ₹100

### Result
```
Alex is owed: ₹100
Kim owes Alex: ₹100
```

---

## Test Scenario 4: Three-Way Split with Multiple Payers

### Input
```javascript
{
  type: 'purchase',
  itemName: 'Office Supplies',
  amount: 1200,
  paymentType: 'multiple',
  paidById: 'user1',
  paidByAmounts: {
    'user1': 400,  // Alice paid ₹400
    'user2': 500,  // Bob paid ₹500
    'user3': 300,  // Charlie paid ₹300
  },
  splitWith: ['user1', 'user2', 'user3', 'user4'],  // 4 people split
}
```

### Calculation
- Total: ₹1200
- Share per person: ₹1200 / 4 = ₹300
- Alice paid: ₹400, owes: ₹300, is owed: ₹100
- Bob paid: ₹500, owes: ₹300, is owed: ₹200
- Charlie paid: ₹300, owes: ₹300, is owed: ₹0
- David paid: ₹0, owes: ₹300

### Result
```
Alice is owed: ₹100
Bob is owed: ₹200
Charlie is settled: ₹0
David owes: ₹300 (distributed among Alice and Bob)
```

---

## Test Scenario 5: Edge Case - One Payer in Multiple Payment Mode

### Input
```javascript
{
  type: 'purchase',
  itemName: 'Software License',
  amount: 500,
  paymentType: 'multiple',
  paidById: 'user1',
  paidByAmounts: {
    'user1': 500,  // Only Sarah paid
  },
  splitWith: ['user1', 'user2', 'user3'],
}
```

### Calculation
- Total: ₹500
- Share per person: ₹500 / 3 = ₹166.67
- Sarah paid: ₹500, owes: ₹166.67, is owed: ₹333.33

### Result
```
Sarah is owed: ₹333.33
John owes Sarah: ₹166.67
Emma owes Sarah: ₹166.66
```

**Note**: This scenario is valid but behaves like single payment. UI guides users to single payment mode for clarity.

---

## Settlement Calculation Algorithm

### For Single Payment
```typescript
for each participant in splitWith:
  if participant != paidById:
    share = amount / splitWith.length
    participant owes paidById: share
```

### For Multiple Payments
```typescript
// Step 1: Calculate what each person should pay
sharePerPerson = amount / splitWith.length

// Step 2: Calculate balance for each participant
for each participant in splitWith:
  amountPaid = paidByAmounts[participant] || 0
  amountOwed = sharePerPerson
  balance[participant] = amountPaid - amountOwed
  
// Step 3: Distribute debts
for each payer where paidByAmounts[payer] > 0:
  for each participant in splitWith:
    if participant != payer:
      owedToThisPayer = (paidByAmounts[payer] / splitWith.length)
      participant owes payer: owedToThisPayer
```

---

## Validation Rules

### Rule 1: Total Must Match
```javascript
// ✅ Valid
{ amount: 900, paidByAmounts: { user1: 500, user2: 400 } }

// ❌ Invalid - Total is 800, not 900
{ amount: 900, paidByAmounts: { user1: 500, user2: 300 } }
```

### Rule 2: At Least One Payer
```javascript
// ✅ Valid
{ paymentType: 'multiple', paidByAmounts: { user1: 500 } }

// ❌ Invalid - No payers
{ paymentType: 'multiple', paidByAmounts: {} }

// ❌ Invalid - All zeros
{ paymentType: 'multiple', paidByAmounts: { user1: 0, user2: 0 } }
```

### Rule 3: Split Members Required
```javascript
// ✅ Valid
{ splitWith: ['user1', 'user2'] }

// ❌ Invalid - Empty split
{ splitWith: [] }
```

### Rule 4: Payment Type Lock
```javascript
// ✅ Valid - Creating new expense
POST /purchases
{ paymentType: 'multiple', ... }

// ❌ Invalid - Changing payment type
PATCH /purchases/123
{ paymentType: 'single' }  // Cannot change from 'multiple' to 'single'
```

---

## Firebase Security Examples

### Creating a Purchase
```javascript
// ✅ Allowed - User is creating their own single payment
{ paidById: 'currentUser', paymentType: 'single' }

// ✅ Allowed - User is one of the payers in multi-payment
{ 
  paymentType: 'multiple',
  paidByAmounts: { 'currentUser': 500, 'otherUser': 400 }
}

// ❌ Denied - User is not a payer
{
  paidById: 'otherUser',
  paymentType: 'single'
}

// ❌ Denied - User not in paidByAmounts
{
  paymentType: 'multiple',
  paidByAmounts: { 'user1': 500, 'user2': 400 }
}
```

### Updating a Purchase
```javascript
// ✅ Allowed - Updating own single payment
PATCH /purchases/123
{ amount: 550 }
// where purchase.paidById == currentUser

// ✅ Allowed - Any payer can update multi-payment
PATCH /purchases/456
{ amount: 950 }
// where currentUser in purchase.paidByAmounts

// ❌ Denied - Trying to change paidById
PATCH /purchases/123
{ paidById: 'otherUser' }

// ❌ Denied - Trying to change paymentType
PATCH /purchases/123
{ paymentType: 'multiple' }
```

### Deleting a Purchase
```javascript
// ✅ Allowed - Deleting own single payment
DELETE /purchases/123
// where purchase.paidById == currentUser

// ✅ Allowed - Any payer can delete multi-payment
DELETE /purchases/456
// where currentUser in purchase.paidByAmounts

// ❌ Denied - Not the payer
DELETE /purchases/123
// where purchase.paidById != currentUser
```

---

## UI State Examples

### Form State: Single Payment
```javascript
{
  paymentType: 'single',
  paidById: 'user1',      // Dropdown visible
  paidByAmounts: {},      // Hidden
  amount: 600,
  splitWith: ['user1', 'user2', 'user3'],
  customSplit: false
}
```

### Form State: Multiple Payments
```javascript
{
  paymentType: 'multiple',
  paidById: 'user1',      // Hidden/Auto-set
  paidByAmounts: {        // Input fields visible
    'user1': 500,
    'user2': 400,
    'user3': 0,
  },
  amount: 900,
  splitWith: ['user1', 'user2', 'user3'],
  customSplit: false
}
```

### Validation Messages
```javascript
// When total doesn't match
"Total of individual payments must equal the expense amount."
"Total paid: ₹800.00 / ₹900.00"  // Shows in yellow

// When total matches
"Total paid: ₹900.00 / ₹900.00"  // Shows in green

// When no payer selected (single mode)
"Payer is required."

// When no amounts entered (multiple mode)
"Payment information is required."
```
