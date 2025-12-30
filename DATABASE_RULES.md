# Firebase Database Rules

This document explains the database rules for both Firestore and Realtime Database.

## Overview

The application uses **Firestore** as the primary database with a **shared collections** model for team expense tracking. The Realtime Database rules are provided for reference if needed in the future.

## Firestore Rules

The Firestore rules are defined in `firestore.rules` and enforce the following security model:

### User Profiles (`/users/{userId}`)

- **Read**: Any authenticated user can read user profiles (needed for split functionality)
- **List**: Any authenticated user can list all users (needed for expense splitting)
- **Create**: Users can only create their own profile
- **Update**: Users can only update their own profile
- **Delete**: Users can only delete their own profile

### Purchases (`/purchases/{purchaseId}`)

- **Read/List**: All authenticated users can read all purchases (for team expense tracking)
- **Create**: Users can create purchases where they are the payer (paidById must match auth.uid)
- **Update**: Only the user who paid can update their purchase (paidById cannot be changed)
- **Delete**: Only the user who paid can delete their purchase
- **Validation**: The `paidById` field must match the authenticated user's ID on create

### Settlements (`/settlements/{settlementId}`)

- **Read/List**: All authenticated users can read all settlements (for team balance calculations)
- **Create**: Users can create settlements where they are the payer (fromId must match auth.uid)
- **Update**: Only the user who paid can update their settlement (fromId cannot be changed)
- **Delete**: Only the user who paid can delete their settlement
- **Validation**: The `fromId` field must match the authenticated user's ID on create

## Realtime Database Rules

The Realtime Database rules are defined in `database.rules.json` and follow a similar security model:

### User Profiles

- All authenticated users can read the users list (for split functionality)
- Only the owner can write/update their profile
- Validates required fields: `id`, `name`, `avatar`

### Purchases and Settlements

- Nested under each user's node
- Only accessible by the user who owns them
- Validates required fields and data types

## Data Structure

### Firestore Structure

```
/users/{userId}
  - id: string
  - name: string
  - avatar: string
  
/purchases/{purchaseId}
  - type: "purchase"
  - itemName: string
  - category: string
  - date: ISO string
  - amount: number
  - paidById: userId (must match authenticated user on create)
  - splitWith: string[] (array of user IDs)
  - createdAt: timestamp
  - updatedAt: timestamp (optional)

/settlements/{settlementId}
  - type: "settlement"
  - fromId: userId (must match authenticated user on create)
  - toId: string (target user ID)
  - amount: number
  - date: ISO string
  - createdAt: timestamp
```

## Deployment

### Firestore Rules

Deploy using Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### Realtime Database Rules

Deploy using Firebase CLI:
```bash
firebase deploy --only database
```

## Security Considerations

1. **Shared Visibility**: All authenticated users can see all purchases and settlements. This is by design for team expense tracking, allowing everyone to see shared expenses and calculate balances.

2. **Write Protection**: Users can only create expenses they pay for (paidById = auth.uid) and can only modify/delete their own expenses. This prevents unauthorized modifications while allowing team visibility.

3. **Data Validation**: All writes are validated to ensure data integrity and prevent invalid data. The paidById and fromId fields are immutable after creation.

4. **Authentication**: All operations require authentication - anonymous access is not allowed.

## Future Improvements

1. Consider using security groups or friend lists to limit user visibility
2. Implement rate limiting for sensitive operations
3. Add audit logging for security-critical operations
4. Consider using Cloud Functions for complex validation logic
