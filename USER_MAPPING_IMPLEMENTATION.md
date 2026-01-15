# User Nickname to Full Name Mapping Implementation

## Overview
This document describes the implementation of automatic user nickname to full name mapping in the DgenBooks application.

## Problem Statement
The application needed to automatically map user nicknames to their full names when users log in. The following mappings were required:
- `tirtha` → `Tirthankar Dasgupta`
- `suko` → `Sukomal Debnath`
- `arpan` → `Arpan Bairagi`
- `sagnik` → `Sagnik Mondal`

## Implementation Details

### 1. User Mapping Utility (`src/lib/user-mapping.ts`)
Created a new utility module that provides:

#### Functions:
- **`getFullNameFromNickname(nickname: string): string`**
  - Converts a nickname to its full name (case-insensitive)
  - Returns the full name if a mapping exists
  - Returns capitalized nickname if no mapping is found
  
- **`getNicknameFromFullName(fullName: string): string`**
  - Converts a full name to its nickname (case-insensitive)
  - Returns the nickname if a mapping exists
  - Returns the first word of the full name in lowercase if no mapping is found
  
- **`isKnownNickname(name: string): boolean`**
  - Checks if a name is a known nickname in the system
  
#### Data Structure:
```typescript
export const USER_NAME_MAPPINGS: UserNameMapping[] = [
  { nickname: 'tirtha', fullName: 'Tirthankar Dasgupta' },
  { nickname: 'suko', fullName: 'Sukomal Debnath' },
  { nickname: 'arpan', fullName: 'Arpan Bairagi' },
  { nickname: 'sagnik', fullName: 'Sagnik Mondal' },
];
```

### 2. Updated User Type (`src/lib/types.ts`)
Extended the `User` type to include an optional `nickname` field:
```typescript
export type User = {
  id: string;
  name: string;
  avatar: string;
  nickname?: string; // Optional nickname field for backwards compatibility
};
```

### 3. Updated User Data (`src/lib/data.ts`)
Updated the hardcoded user data to use full names:
```typescript
export const users: User[] = [
  { id: 'user1', name: 'Tirthankar Dasgupta', nickname: 'tirtha', avatar: '...' },
  { id: 'user2', name: 'Sukomal Debnath', nickname: 'suko', avatar: '...' },
  { id: 'user3', name: 'Arpan Bairagi', nickname: 'arpan', avatar: '...' },
  { id: 'user4', name: 'Sagnik Mondal', nickname: 'sagnik', avatar: '...' },
];
```

### 4. Authentication Flow Updates

#### Signup Page (`src/app/auth/signup/page.tsx`)
- Import `getFullNameFromNickname` utility
- When a user signs up with email/password:
  ```typescript
  const fullName = getFullNameFromNickname(name.trim());
  await createUserProfile(firestore, userCredential.user.uid, {
    name: fullName,
    avatar: `...`,
  });
  ```
- When a user signs up with Google:
  ```typescript
  const displayName = result.user.displayName || 'User';
  const fullName = getFullNameFromNickname(displayName);
  ```

#### Login Page (`src/app/auth/login/page.tsx`)
- Import `getFullNameFromNickname` utility
- When a user logs in with Google:
  ```typescript
  const displayName = result.user.displayName || 'User';
  const fullName = getFullNameFromNickname(displayName);
  ```

#### User Profile Creation (`src/lib/db/users.ts`)
- Import `getNicknameFromFullName` utility
- Automatically generate nickname from full name when creating a user profile:
  ```typescript
  const nickname = userData.nickname || getNicknameFromFullName(userData.name);
  ```

## How It Works

### For New Users
1. User enters their name during signup (e.g., "tirtha", "Tirtha", or "TIRTHA")
2. The system converts it to the full name "Tirthankar Dasgupta"
3. User profile is created in Firestore with the full name
4. A nickname is automatically generated and stored with the profile

### For Existing Users
1. Users with existing profiles continue to work normally
2. Their full names are displayed throughout the application
3. If they update their profile, the mapping will be applied

### Case Sensitivity
- All nickname matching is case-insensitive
- "tirtha", "Tirtha", "TIRTHA" all map to "Tirthankar Dasgupta"

### Unknown Names
- If a name is not in the mapping, it's treated as follows:
  - For nicknames: First letter is capitalized
  - For full names: First word becomes the nickname in lowercase

## Files Modified

1. **Created:**
   - `src/lib/user-mapping.ts` - New utility module for name mapping

2. **Updated:**
   - `src/lib/types.ts` - Added optional `nickname` field to User type
   - `src/lib/data.ts` - Updated hardcoded users to use full names
   - `src/lib/db/users.ts` - Added nickname generation in createUserProfile
   - `src/app/auth/signup/page.tsx` - Apply mapping during signup
   - `src/app/auth/login/page.tsx` - Apply mapping during login

## Testing
The implementation has been tested with:
- TypeScript compilation: ✅ Passed
- Next.js build: ✅ Passed (production build successful)
- All components use the updated data structure

## Usage Throughout the Application

The full names are now displayed in:
- Dashboard (Recent Activity)
- Expense Log (Paid By column)
- Settle Up page (Debt cards)
- Expense Form (Split With selection)
- Header (User dropdown)
- All other components that display user information

## Future Enhancements

To add more users to the mapping:
1. Add entries to the `USER_NAME_MAPPINGS` array in `src/lib/user-mapping.ts`
2. No other code changes are required

Example:
```typescript
export const USER_NAME_MAPPINGS: UserNameMapping[] = [
  // Existing mappings...
  { nickname: 'newuser', fullName: 'New User Full Name' },
];
```

## Notes

- The mapping is applied automatically during authentication
- Existing Firestore data is not modified - mapping only affects new user creation
- The implementation is backward compatible with users who don't have nicknames
- All name comparisons are case-insensitive for user convenience
