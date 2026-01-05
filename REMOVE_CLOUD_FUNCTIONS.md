# Removing Firebase Cloud Functions

## ⚠️ Important: Delete Deployed Cloud Functions

If Firebase Cloud Functions were previously deployed to your project, you need to **manually delete them** from the Firebase Console to avoid charges.

## Why Remove Cloud Functions?

Firebase Cloud Functions require the **Blaze (pay-as-you-go) plan** which costs money based on usage. The app now uses **Vercel API Routes** instead, which are completely free.

## Steps to Remove Cloud Functions

### 1. Check if Functions are Deployed

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `dgenbooks`
3. Navigate to **Functions** section in the left sidebar
4. Check if any functions are listed

### 2. Delete Each Function

For each function listed (if any):
- `onPurchaseCreated`
- `onPurchaseUpdated`
- `onPurchaseDeleted`
- `onPurchaseRequestCreated`
- `onSettlementCreated`
- `onSettlementUpdated`
- `onSettlementDeleted`

**Steps:**
1. Click the three dots (⋮) next to the function name
2. Select **Delete function**
3. Confirm deletion

### 3. Alternative: Delete via Firebase CLI

If you have Firebase CLI installed and authenticated:

```bash
# List all functions
firebase functions:list

# Delete all functions at once
firebase functions:delete onPurchaseCreated onPurchaseUpdated onPurchaseDeleted onPurchaseRequestCreated onSettlementCreated onSettlementUpdated onSettlementDeleted

# Or delete individually
firebase functions:delete onPurchaseCreated
firebase functions:delete onPurchaseUpdated
# ... etc
```

### 4. Verify Deletion

1. Go back to Firebase Console → Functions
2. Confirm no functions are listed
3. Check Firebase billing to ensure no function invocations are being charged

## What Happens to Notifications?

✅ **Notifications will continue to work!**

The app now uses:
- **Vercel API Route**: `/api/send-notification` (free, hosted on Vercel)
- **Client-side triggers**: Notifications are sent when expenses/settlements are created/updated/deleted
- **Firestore for tokens**: FCM tokens are still stored in Firestore (free tier)

## Cost Breakdown

| Service | Before | After |
|---------|--------|-------|
| Firebase Cloud Functions | 💰 Paid (Blaze plan required) | ✅ Free (removed) |
| Vercel API Routes | N/A | ✅ Free (Vercel free tier) |
| Firestore (token storage) | ✅ Free (Spark plan) | ✅ Free (Spark plan) |
| Firebase Cloud Messaging | ✅ Free | ✅ Free |
| Firebase Auth | ✅ Free | ✅ Free |

## Configuration Changes

The following files have been updated:

1. **firebase.json** - Removed `functions` configuration section
2. **functions/README.md** - Added deprecation notice
3. This file - Instructions for removing deployed functions

## If Notifications Stop Working

If notifications stop working after removing Cloud Functions:

1. **Check Vercel deployment**: Ensure `/api/send-notification` is deployed
2. **Check environment variables**: Verify `FIREBASE_SERVICE_ACCOUNT` is set in Vercel
3. **Check console logs**: Use the debugging guide in `NOTIFICATION_DEBUGGING_GUIDE.md`
4. **Verify API route**: Visit `https://your-app.vercel.app/api/send-notification` (should return 405 for GET requests)

## Need Help?

Refer to:
- `VERCEL-NOTIFICATIONS-SETUP.md` - Vercel-based notification setup
- `NOTIFICATION_DEBUGGING_GUIDE.md` - Debugging notification issues
- Firebase Console → Functions → Logs (if functions are still deployed)
