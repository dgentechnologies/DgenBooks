# Firebase Cloud Functions for DgenBooks

⚠️ **DEPRECATED - NOT CURRENTLY IN USE**

This directory contains Firebase Cloud Functions code that was originally designed to handle push notifications. However, **these functions are NOT currently deployed or in use** to avoid Firebase Blaze plan costs.

## Current Notification Implementation

Notifications are now handled via **Vercel API Routes** (completely free):
- API Route: `/src/app/api/send-notification/route.ts`
- Client calls: `/src/lib/db/purchases.ts` and `/src/lib/db/settlements.ts`

See `VERCEL-NOTIFICATIONS-SETUP.md` for the current implementation.

## Why Cloud Functions are Disabled

Firebase Cloud Functions require the **Blaze (pay-as-you-go) plan**, while Firestore and Firebase Auth are free. By using Vercel API Routes instead:
- ✅ Completely free (Vercel free tier)
- ✅ No Firebase billing required
- ✅ Same notification functionality

## If You Want to Use Cloud Functions

If you prefer automatic triggers and don't mind the cost:

1. Uncomment the `functions` section in `firebase.json`
2. Remove notification calls from `/src/lib/db/purchases.ts` and `/src/lib/db/settlements.ts`
3. Deploy functions: `firebase deploy --only functions`

Note: You'll need to upgrade to Firebase Blaze plan.

## Previous Documentation

<details>
<summary>Original README (click to expand)</summary>

This directory contains Firebase Cloud Functions that handle push notifications for the DgenBooks application.

### Setup

1. Install dependencies:
```bash
cd functions
npm install
```

2. Build the functions:
```bash
npm run build
```

3. Deploy to Firebase:
```bash
npm run deploy
```

### Functions

#### `onPurchaseCreated`
Triggered when a new expense is created. Sends notifications to all team members who are part of the expense split (except the creator).

#### `onPurchaseRequestCreated`
Triggered when a new purchase request is created. For urgent requests, notifies all team members (except the requester).

#### `onSettlementCreated`
Triggered when a new settlement is created. Notifies the user who receives the payment.

### Local Development

To test functions locally with Firebase Emulators:

```bash
npm run serve
```

### Configuration

Make sure your Firebase project is properly configured:
- Firebase Admin SDK initialized
- Firestore database enabled
- Cloud Messaging enabled
- Proper security rules in place

### Notification Flow

1. User performs an action (creates expense, request, or settlement)
2. Cloud Function is triggered by Firestore document creation
3. Function retrieves FCM tokens from affected users
4. Notification is sent via Firebase Cloud Messaging
5. Invalid tokens are automatically removed from user documents

</details>
