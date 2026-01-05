# FREE Vercel-Based Push Notifications Setup

## ✅ This is the ACTIVE Implementation

**This is the current notification system being used.** Firebase Cloud Functions have been disabled to avoid Blaze plan costs. See `REMOVE_CLOUD_FUNCTIONS.md` if you need to delete previously deployed functions.

## Overview

This implementation uses Vercel's free computing power to send push notifications instead of Firebase Cloud Functions (which requires paid Blaze plan). The notifications are triggered directly from the client-side code when expenses or settlements are created, updated, or deleted.

## How It Works

### Architecture

```
User Action (Add Expense)
         ↓
Frontend Code (expense-form.tsx)
         ↓
Save to Firestore (createPurchase)
         ↓
Get FCM Tokens (from Firestore users collection)
         ↓
Call Vercel API (/api/send-notification)
         ↓
Firebase Cloud Messaging (FCM)
         ↓
Push Notification to User Devices
```

### Key Differences from Cloud Functions

**Cloud Functions (Paid Blaze Plan - NOT USED):**
- Notifications triggered automatically by Firestore changes
- More reliable (server-side triggers)
- Costs money after free tier
- ❌ **Disabled in this project**

**Vercel API Routes (100% Free - CURRENTLY USED):**
- Notifications triggered manually from client code
- Runs on Vercel's free tier
- Dependent on client app being online when action occurs
- ✅ **Active implementation**

### What Uses Firestore (Free Tier)

The following Firestore features are used and are FREE on the Spark plan:
- ✅ **Storing FCM tokens** in user documents (necessary for notifications)
- ✅ **Authentication** (Firebase Auth)
- ✅ **Database** for expenses, settlements, users

**Free Tier Limits (Spark Plan):**
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage
- 10 GB/month network egress

For typical expense tracking usage (small teams), these limits are more than sufficient. **You do NOT need to upgrade to Blaze plan** for this app to work.

## Setup Instructions

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (`dgenbooks`)
3. Click the gear icon → **Project Settings**
4. Navigate to the **Service Accounts** tab
5. Click **Generate new private key**
6. Save the downloaded JSON file securely

### Step 2: Add Service Account to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your DgenBooks project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Key**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the entire JSON content from Step 1
5. Click **Save**

### Step 3: Deploy to Vercel

The code changes are already in place. Simply deploy:

```bash
# If you haven't connected to Vercel yet
npm install -g vercel
vercel login

# Deploy
vercel --prod
```

Or push to your GitHub repository and Vercel will auto-deploy.

### Step 4: Verify Deployment

1. Open your app
2. Enable notifications in Settings
3. Have another user add an expense with you in the split
4. You should receive a push notification!

## What Gets Notified

All users receive push notifications for:

1. ✅ **Expense Created** - "John paid ₹50.00 for Groceries"
2. ✅ **Expense Updated** - "John updated expense: Groceries (amount changed)"
3. ✅ **Expense Deleted** - "John deleted expense: Groceries (₹50.00)"
4. ✅ **Settlement Created** - "John settled up ₹25.00 with you"
5. ✅ **Settlement Updated** - "John updated a settlement with you"
6. ✅ **Settlement Deleted** - "John removed a settlement of ₹25.00"

## Files Changed

### New Files
- `src/app/api/send-notification/route.ts` - Vercel API endpoint
- `src/lib/notifications.ts` - Helper functions for sending notifications
- `VERCEL-NOTIFICATIONS-SETUP.md` - This documentation

### Modified Files
- `src/lib/db/purchases.ts` - Added notification calls to create/update/delete
- `src/lib/db/settlements.ts` - Added notification calls to create/update/delete
- `package.json` - Added `firebase-admin` dependency

## How Notifications Are Sent

### Example: Creating an Expense

```typescript
// In purchases.ts
export async function createPurchase(
  firestore: Firestore,
  userId: string,
  purchaseData: Omit<Purchase, 'id'>
): Promise<string> {
  // 1. Save to Firestore
  const docRef = await addDoc(purchasesRef, purchaseData);
  
  // 2. Get users to notify (everyone in split except payer)
  const usersToNotify = purchaseData.splitWith.filter(
    id => id !== purchaseData.paidById
  );
  
  // 3. Send notifications
  notifyUsers(firestore, usersToNotify, {
    title: '💳 New Expense Added',
    body: `${payerName} paid $${amount} for ${item}`,
    data: { type: 'expense', url: '/log', itemId: docRef.id }
  });
  
  return docRef.id;
}
```

### The `notifyUsers` Helper

```typescript
// In notifications.ts
export async function notifyUsers(
  firestore: Firestore,
  userIds: string[],
  notification: { title: string; body: string; data?: any }
): Promise<void> {
  // 1. Get FCM tokens from Firestore
  const tokenMap = await getUserTokens(firestore, userIds);
  const allTokens = Array.from(tokenMap.values()).flat();
  
  // 2. Call Vercel API
  await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokens: allTokens,
      title: notification.title,
      body: notification.body,
      data: notification.data
    })
  });
}
```

### The Vercel API Route

```typescript
// In api/send-notification/route.ts
export async function POST(request: Request) {
  // 1. Initialize Firebase Admin (uses FIREBASE_SERVICE_ACCOUNT env var)
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT || '{}'
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  // 2. Send notification via FCM
  const { tokens, title, body, data } = await request.json();
  const response = await admin.messaging().sendEachForMulticast({
    notification: { title, body },
    data,
    tokens
  });
  
  return NextResponse.json({ success: true });
}
```

## Cost Comparison

### Firebase Cloud Functions (Previous Approach)
- **Free Tier**: 2M invocations/month, 400K GB-seconds
- **After Free Tier**: Paid Blaze plan required
- **Typical Cost**: $5-20/month for small apps

### Vercel + FCM (Current Approach)
- **Vercel Free Tier**: Unlimited API calls (with fair use)
- **Firebase FCM**: Always free (unlimited messages)
- **Total Cost**: $0/month forever

## Limitations

### Compared to Cloud Functions

**Pros:**
- ✅ 100% Free
- ✅ Works on Vercel free tier
- ✅ No Firebase Blaze plan needed
- ✅ Same notification quality

**Cons:**
- ⚠️ Requires client app to be online when action occurs
- ⚠️ If network fails between save and notification, notification may be lost
- ⚠️ Slightly less reliable than server-side triggers

### Real-World Impact

In practice, the limitations are minimal because:
- Users typically keep the app open while making changes
- Modern browsers/apps handle network issues well
- The notification code includes error handling and logging
- Failed notifications don't affect data integrity

## Troubleshooting

### "Notification not sent"
1. Check Vercel environment variables are set correctly
2. Verify service account JSON is valid
3. Check Vercel function logs for errors
4. Ensure users have FCM tokens in Firestore

### "FIREBASE_SERVICE_ACCOUNT not found"
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add the variable with complete JSON content
3. Redeploy the app

### "Users not receiving notifications"
1. Verify users have enabled notifications in Settings
2. Check FCM tokens are saved in user documents
3. Test with a simple notification from Settings page
4. Check browser console for errors

### "API route not found"
1. Ensure `src/app/api/send-notification/route.ts` exists
2. Rebuild and redeploy: `vercel --prod`
3. Check Vercel deployment logs

## Testing

### Test Notification Flow

1. **Enable Notifications** (both users)
   - User A: Open app → Settings → Enable notifications
   - User B: Open app → Settings → Enable notifications

2. **Test Expense Creation**
   - User A: Add new expense, include User B in split
   - User B: Should receive notification immediately

3. **Test Expense Update**
   - User A: Edit the expense (change amount)
   - User B: Should receive update notification

4. **Test Expense Delete**
   - User A: Delete the expense
   - User B: Should receive delete notification

5. **Test Settlement**
   - User A: Create settlement paying User B
   - User B: Should receive settlement notification

### Check Logs

**Vercel Function Logs:**
```bash
vercel logs
```

**Browser Console:**
```javascript
// Should see:
"Notification sent: 1 success, 0 failures"
```

## Migration from Cloud Functions

If you previously set up Cloud Functions, you can keep both approaches:

1. Cloud Functions will continue to work if deployed
2. Client-side notifications will also work (duplicate notifications possible)
3. To avoid duplicates, undeploy Cloud Functions:
   ```bash
   firebase functions:delete onPurchaseCreated
   firebase functions:delete onPurchaseUpdated
   firebase functions:delete onPurchaseDeleted
   firebase functions:delete onSettlementCreated
   firebase functions:delete onSettlementUpdated
   firebase functions:delete onSettlementDeleted
   ```

## Security

- ✅ Firebase service account stored securely in Vercel environment variables
- ✅ API route validates all inputs before sending
- ✅ Only valid FCM tokens can receive notifications
- ✅ Firestore security rules prevent unauthorized access
- ✅ No sensitive data exposed in notification content

## Support

For issues:
1. Check Vercel function logs: `vercel logs`
2. Check browser console for errors
3. Verify environment variables in Vercel dashboard
4. Test with Firebase Console → Cloud Messaging test

## Summary

You now have a **100% free** push notification system that:
- Sends notifications for all expense and settlement changes
- Runs entirely on Vercel's free tier
- Uses Firebase Cloud Messaging (also free)
- Requires no paid Firebase plan
- Works reliably for most use cases

The only trade-off is that it requires the client app to be online when the action occurs, which is typically the case for expense tracking apps.
