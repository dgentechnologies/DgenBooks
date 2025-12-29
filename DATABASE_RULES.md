# Firebase Database Rules

This document explains the database rules for both Firestore and Realtime Database.

## Overview

The application uses **Firestore** as the primary database. The Realtime Database rules are provided for reference if needed in the future.

## Firestore Rules

The Firestore rules are defined in `firestore.rules` and enforce the following security model:

### User Profiles (`/users/{userId}`)

- **Read**: Any authenticated user can read user profiles (needed for split functionality)
- **List**: Any authenticated user can list all users (needed for expense splitting)
- **Create**: Users can only create their own profile
- **Update**: Users can only update their own profile
- **Delete**: Users can only delete their own profile

### Purchases (`/users/{userId}/purchases/{purchaseId}`)

- **Read/List**: Users can only access their own purchases
- **Create**: Users can create purchases in their own collection
- **Update**: Users can update their own purchases
- **Delete**: Users can delete their own purchases
- **Validation**: The `paidById` field must match the user's ID

### Settlements (`/users/{userId}/settlements/{settlementId}`)

- **Read/List**: Users can only access their own settlements
- **Create**: Users can create settlements in their own collection
- **Update**: Users can update their own settlements
- **Delete**: Users can delete their own settlements
- **Validation**: The `fromUserId` field must match the user's ID

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
    - paidById: userId (must match parent)
    - splitWith: string[] (array of user IDs)
    - createdAt: timestamp
    - updatedAt: timestamp (optional)
  
  /settlements/{settlementId}
    - type: "settlement"
    - fromId: userId (must match parent)
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

1. **User Enumeration**: While users can list all profiles, this is necessary for the split expense functionality. Consider implementing additional measures if user privacy is a concern.

2. **Data Validation**: All writes are validated to ensure data integrity and prevent invalid data.

3. **Ownership**: The rules enforce strict ownership - users can only modify their own data.

4. **Authentication**: All operations require authentication - anonymous access is not allowed.

## Future Improvements

1. Consider using security groups or friend lists to limit user visibility
2. Implement rate limiting for sensitive operations
3. Add audit logging for security-critical operations
4. Consider using Cloud Functions for complex validation logic
