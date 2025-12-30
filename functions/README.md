# Firebase Cloud Functions for DgenBooks

This directory contains Firebase Cloud Functions that handle push notifications for the DgenBooks application.

## Setup

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

## Functions

### `onPurchaseCreated`
Triggered when a new expense is created. Sends notifications to all team members who are part of the expense split (except the creator).

### `onPurchaseRequestCreated`
Triggered when a new purchase request is created. For urgent requests, notifies all team members (except the requester).

### `onSettlementCreated`
Triggered when a new settlement is created. Notifies the user who receives the payment.

## Local Development

To test functions locally with Firebase Emulators:

```bash
npm run serve
```

## Configuration

Make sure your Firebase project is properly configured:
- Firebase Admin SDK initialized
- Firestore database enabled
- Cloud Messaging enabled
- Proper security rules in place

## Notification Flow

1. User performs an action (creates expense, request, or settlement)
2. Cloud Function is triggered by Firestore document creation
3. Function retrieves FCM tokens from affected users
4. Notification is sent via Firebase Cloud Messaging
5. Invalid tokens are automatically removed from user documents
