# Push Notification Deployment Guide

## Overview
This guide explains how to deploy the updated Cloud Functions that add push notification support for expense and settlement updates and deletions.

## What's New
The following notification triggers have been added:

### New Cloud Functions
1. **onPurchaseUpdated** - Sends notifications when an expense is edited
2. **onPurchaseDeleted** - Sends notifications when an expense is removed
3. **onSettlementUpdated** - Sends notifications when a settlement is modified
4. **onSettlementDeleted** - Sends notifications when a settlement is removed

### All Notification Events (7 Total)
1. ✅ New expense added
2. ✅ **Expense updated** (NEW)
3. ✅ **Expense deleted** (NEW)
4. ✅ Urgent purchase request
5. ✅ New settlement payment
6. ✅ **Settlement updated** (NEW)
7. ✅ **Settlement deleted** (NEW)

## Prerequisites
- Firebase CLI installed (`npm install -g firebase-tools`)
- Authenticated with Firebase (`firebase login`)
- Project selected (`firebase use dgenbooks`)

## Deployment Steps

### 1. Install Dependencies (if not already done)
```bash
cd functions
npm install
```

### 2. Build the Functions
```bash
cd functions
npm run build
```

### 3. Deploy to Firebase
Deploy only the functions (recommended for this update):
```bash
firebase deploy --only functions
```

Or deploy everything:
```bash
firebase deploy
```

### 4. Verify Deployment
After deployment, verify in Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `dgenbooks`
3. Navigate to **Functions** section
4. Verify all 7 functions are listed and active:
   - onPurchaseCreated
   - **onPurchaseUpdated** (new)
   - **onPurchaseDeleted** (new)
   - onPurchaseRequestCreated
   - onSettlementCreated
   - **onSettlementUpdated** (new)
   - **onSettlementDeleted** (new)

### 5. Monitor Function Logs
Watch the logs to ensure functions are working:
```bash
firebase functions:log --only onPurchaseUpdated,onPurchaseDeleted,onSettlementUpdated,onSettlementDeleted
```

Or view all logs:
```bash
firebase functions:log
```

## Testing the New Notifications

### Test Expense Update Notification
1. Open the app
2. Go to Expense Log
3. Edit an existing expense (change amount or item name)
4. All users in the split (except you) should receive a notification

### Test Expense Delete Notification
1. Open the app
2. Go to Expense Log
3. Delete an expense
4. All users in the split (except you) should receive a notification

### Test Settlement Update Notification
1. Open the app
2. Go to Settle page
3. Edit an existing settlement
4. The recipient should receive a notification

### Test Settlement Delete Notification
1. Open the app
2. Go to Settle page
3. Delete a settlement
4. The recipient should receive a notification

## Rollback (if needed)
If issues occur, you can rollback to the previous version:
```bash
firebase functions:rollback onPurchaseUpdated
firebase functions:rollback onPurchaseDeleted
firebase functions:rollback onSettlementUpdated
firebase functions:rollback onSettlementDeleted
```

## Troubleshooting

### Functions not deploying
- Check that you're authenticated: `firebase login`
- Verify project: `firebase use dgenbooks`
- Check Node.js version (should be 18 or compatible)

### No notifications received
1. Check function logs for errors: `firebase functions:log`
2. Verify user has FCM tokens in Firestore
3. Check notification permissions in browser/app settings
4. Verify service worker is registered

### Function errors in logs
- Most validation errors will be logged but won't crash the function
- Check for missing fields in Firestore documents
- Verify all users have valid FCM tokens

## Security
- All new functions include validation for required fields
- Type checking prevents runtime errors with amounts
- Early returns handle edge cases gracefully
- CodeQL security scan: No vulnerabilities found

## Performance
- Functions use the same efficient patterns as existing notification functions
- Batch notifications using Promise.all()
- Invalid FCM tokens are automatically cleaned up
- No impact on existing functionality

## Support
If you encounter issues:
1. Check Firebase Console for function errors
2. Review function logs: `firebase functions:log`
3. Verify Firestore security rules allow the operations
4. Ensure all users have valid FCM tokens

## Next Steps
After successful deployment:
1. Announce the new feature to users
2. Monitor function performance in Firebase Console
3. Collect user feedback on notification experience
4. Consider adding notification preferences in future updates
