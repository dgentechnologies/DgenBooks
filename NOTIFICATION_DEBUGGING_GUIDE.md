# Push Notification Debugging Guide

This guide explains the comprehensive logging system added to help debug push notification issues.

## Overview

Logs have been added throughout the notification pipeline to help identify where notifications might be failing:

1. **Firebase Admin SDK Initialization** (on app startup)
2. **Database Operations** (when expenses/settlements are created/updated/deleted)
3. **Token Fetching** (retrieving FCM tokens from Firestore)
4. **API Calls** (sending notifications to the backend)
5. **Firebase Cloud Messaging** (actual notification delivery)

## Log Prefixes

All logs use emoji prefixes for easy filtering:

- ✅ **Success** - Operation completed successfully
- ❌ **Error** - Operation failed
- ⚠️ **Warning** - Potential issue or missing data
- 🔔 **Notification** - Notification trigger event
- 📨 **API Request** - API endpoint received request
- 📡 **API Response** - API endpoint responded
- 📤 **Sending** - Preparing to send notification
- 🔍 **Fetching** - Retrieving data
- 📦 **Batch** - Processing data in batches
- 📄 **Document** - Firestore document operation
- 📋 **Info** - General information
- 🚀 **Delivery** - Sending to FCM
- 💳 **Expense** - Expense-related operation
- 📢 **Notify** - Notifying users

## Log Locations and What to Check

### 1. Firebase Admin SDK Initialization

**When**: Application startup (when route is first accessed)  
**Where**: `/api/send-notification/route.ts`  
**What to look for**:

```
✅ FIREBASE_SERVICE_ACCOUNT environment variable found
📏 FIREBASE_SERVICE_ACCOUNT length: XXXX characters
✅ FIREBASE_SERVICE_ACCOUNT has all required fields
📋 Project ID: your-project-id
📧 Client Email: firebase-adminsdk@your-project.iam.gserviceaccount.com
✅ Firebase Admin SDK initialized successfully
```

**Common Issues**:
- `❌ FIREBASE_SERVICE_ACCOUNT environment variable not found!` - Environment variable is not set
- `❌ FIREBASE_SERVICE_ACCOUNT is missing required fields!` - JSON is malformed or incomplete
- `❌ Failed to initialize Firebase Admin` - Invalid service account credentials

### 2. Expense/Settlement Operations

**When**: User creates/updates/deletes an expense or settlement  
**Where**: `/lib/db/purchases.ts` or `/lib/db/settlements.ts`  
**What to look for**:

```
🔔 [createPurchase] Expense created: {
  purchaseId: "abc123",
  paidById: "user1",
  amount: 50.00,
  itemName: "Groceries",
  splitWith: ["user1", "user2"],
  usersToNotify: ["user2"]
}
📢 [createPurchase] Notifying 1 user(s) about new expense by John
```

**Common Issues**:
- `ℹ️ No users to notify` - Only the payer is in the split, or splitWith array is empty
- Missing logs entirely - The database operation may not be executing

### 3. Token Fetching

**When**: After determining which users to notify  
**Where**: `/lib/notifications.ts` → `getUserTokens()`  
**What to look for**:

```
🔍 [getUserTokens] Fetching tokens for 2 user(s): ["user1", "user2"]
  📦 [getUserTokens] Processing batch 1: 2 user(s)
  📄 [getUserTokens] Retrieved 2 user document(s) from Firestore
  ✅ [getUserTokens] User user1: 1 token(s) found
  ✅ [getUserTokens] User user2: 2 token(s) found
✅ [getUserTokens] Complete: Found 3 token(s) across 2 user(s)
```

**Common Issues**:
- `⚠️ [getUserTokens] User userX: No FCM tokens found` - User hasn't enabled notifications or logged in
- `✅ [getUserTokens] Complete: Found 0 token(s)` - No users have FCM tokens registered

### 4. Sending Notification

**When**: After collecting tokens  
**Where**: `/lib/notifications.ts` → `sendNotification()`  
**What to look for**:

```
📤 [sendNotification] Preparing to send notification: {
  tokensCount: 3,
  title: "💳 New Expense Added",
  bodyPreview: "John paid $50.00 for Groceries",
  dataKeys: ["type", "url", "itemId"]
}
🌐 [sendNotification] Making POST request to /api/send-notification...
📡 [sendNotification] API responded with status: 200
📨 [sendNotification] API response: { success: true, successCount: 3, failureCount: 0 }
✅ [sendNotification] Notification sent successfully: 3 success, 0 failures
```

**Common Issues**:
- `❌ [sendNotification] Failed to send notification` - API returned error
- API responds with status 500 - Server error (check API logs)
- API responds with status 400 - Invalid request (missing data)

### 5. API Processing

**When**: API endpoint receives request  
**Where**: `/api/send-notification/route.ts`  
**What to look for**:

```
📨 [NOTIFICATION API] Received notification request
📋 [NOTIFICATION API] Request details: {
  tokensCount: 3,
  title: "💳 New Expense Added",
  messageBodyPreview: "John paid $50.00 for Groceries",
  dataKeys: ["type", "url", "itemId"]
}
✅ [NOTIFICATION API] Validation passed. Preparing message...
🚀 [NOTIFICATION API] Sending to 3 token(s)...
✅ [NOTIFICATION API] Notification sent: 3 success, 0 failures (took 1234ms)
```

**Common Issues**:
- `❌ [NOTIFICATION API] Validation failed: No tokens provided` - No FCM tokens in request
- `❌ [NOTIFICATION API] Firebase Admin is not initialized!` - SDK initialization failed
- `❌ Token X (...): { errorCode: "...", errorMessage: "..." }` - Specific token failures

## Common Error Codes

### FCM Error Codes

- **`registration-token-not-registered`** - Token is no longer valid (user uninstalled app or cleared data)
- **`invalid-registration-token`** - Token format is invalid
- **`invalid-argument`** - Invalid message payload
- **`authentication-error`** - Firebase credentials are invalid
- **`third-party-auth-error`** - APNs/FCM credential issues

## Debugging Workflow

### Step 1: Check Firebase Admin Initialization
1. Look for Firebase Admin logs on first API call
2. Verify `FIREBASE_SERVICE_ACCOUNT` is set correctly
3. Verify all required fields are present

### Step 2: Trigger a Test Notification
1. Create/update/delete an expense or settlement
2. Check database operation logs (`🔔 [createPurchase]`, etc.)
3. Verify users to notify are identified correctly

### Step 3: Check Token Fetching
1. Look for `🔍 [getUserTokens]` logs
2. Verify tokens are found for users
3. If no tokens found, users need to enable notifications in app settings

### Step 4: Check API Call
1. Look for `📤 [sendNotification]` logs
2. Verify API request is made
3. Check API response status and payload

### Step 5: Check FCM Delivery
1. Look for `✅ [NOTIFICATION API] Notification sent` logs
2. Check success/failure counts
3. If failures, check error codes for specific tokens

## Testing Recommendations

1. **Enable verbose logging in your browser console**
   - Open DevTools → Console
   - Filter by emoji prefixes (e.g., "✅", "❌", "🔔")

2. **Test with multiple scenarios**:
   - User with notifications enabled
   - User without notifications enabled
   - User not logged in on any device
   - Multiple users in expense split

3. **Check Vercel logs** (for production):
   - Go to Vercel Dashboard → Your Project → Logs
   - Filter by `/api/send-notification`
   - Look for initialization and API logs

4. **Check browser console** (for development):
   - All client-side logs appear in browser console
   - All API logs appear in terminal running `npm run dev`

## Quick Fixes

### Issue: "No FCM tokens found"
**Solution**: Users must enable notifications in the app settings page and grant browser permission

### Issue: "FIREBASE_SERVICE_ACCOUNT not found"
**Solution**: Set the environment variable in Vercel dashboard or `.env.local` file

### Issue: "Firebase Admin not initialized"
**Solution**: Check service account JSON format and verify credentials are valid

### Issue: Notifications not reaching device
**Solution**: 
1. Verify Firebase Cloud Messaging is enabled in Firebase Console
2. Check FCM tokens are being saved correctly in Firestore
3. Test with a different device/browser
4. Check if service worker is registered (for web push)

## Additional Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Service Worker Setup](../public/firebase-messaging-sw.js)
