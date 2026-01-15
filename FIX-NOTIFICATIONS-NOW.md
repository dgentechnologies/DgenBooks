# IMPORTANT: Push Notifications Not Working - FIX REQUIRED

## 🚨 THE PROBLEM
Push notifications are **NOT WORKING** because the Cloud Functions have **NEVER BEEN DEPLOYED** to Firebase.

The code exists in this repository, but it's only running on Firebase servers if you deploy it.

## ✅ THE SOLUTION - DEPLOY NOW

### Quick Fix (3 steps):

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Deploy the functions**:
   ```bash
   ./deploy-functions.sh
   ```
   
   OR manually:
   ```bash
   cd functions
   npm install
   npm run build
   cd ..
   firebase deploy --only functions
   ```

## 🎯 WHAT THIS FIXES

After deployment, ALL users will receive push notifications for:

1. ✅ **When someone ADDS a new expense** - "John paid $50.00 for Groceries"
2. ✅ **When someone UPDATES an expense** - "John updated expense: Groceries (amount changed)"
3. ✅ **When someone DELETES an expense** - "John deleted expense: Groceries ($50.00)"
4. ✅ **When someone creates an urgent request** - "John needs Milk urgently (~$5.00)"
5. ✅ **When someone ADDS a settlement** - "John settled up $25.00 with you"
6. ✅ **When someone UPDATES a settlement** - "John updated a settlement with you"
7. ✅ **When someone DELETES a settlement** - "John removed a settlement of $25.00"

## 🔍 VERIFY DEPLOYMENT

After deploying, verify the functions are active:

```bash
firebase functions:list
```

You should see these 7 functions listed as **ACTIVE**:
- onPurchaseCreated
- onPurchaseUpdated
- onPurchaseDeleted
- onPurchaseRequestCreated
- onSettlementCreated
- onSettlementUpdated
- onSettlementDeleted

## 📊 MONITOR FUNCTIONS

Watch the logs in real-time to see notifications being sent:

```bash
firebase functions:log --only onPurchaseCreated
```

Or view all logs:

```bash
firebase functions:log
```

## 🧪 TEST NOTIFICATIONS

After deployment:

1. **Open the app on Device A** (enable notifications in Settings)
2. **Open the app on Device B** (enable notifications in Settings)
3. **On Device B**: Add a new expense and include Device A's user in the split
4. **On Device A**: You should receive a push notification immediately!

## ❓ TROUBLESHOOTING

### "firebase: command not found"
Install Firebase CLI:
```bash
npm install -g firebase-tools
```

### "Permission denied"
Login to Firebase:
```bash
firebase login
```

### "Functions deploy failed"
1. Check you're logged in: `firebase projects:list`
2. Ensure you have permissions on the `dgenbooks` project
3. Try again with full deployment: `firebase deploy`

### "Still no notifications after deployment"
1. Check users have enabled notifications in Settings
2. Verify FCM tokens are saved in Firestore (check user documents)
3. Check function logs: `firebase functions:log`
4. Verify service worker is registered (browser console)

## 🔒 SECURITY

All functions include:
- ✅ Field validation
- ✅ Error handling
- ✅ Token cleanup for invalid devices
- ✅ CodeQL security scan passed

## 📝 DEPLOYMENT STATUS

**Current Status**: ⚠️ **NOT DEPLOYED**

**Action Required**: Run `./deploy-functions.sh` NOW

**After Deployment**: ✅ All notifications will work automatically

---

## 💡 IMPORTANT NOTE FOR USER

The functions code has been in this repository for a while, but **GitHub code ≠ Firebase deployment**.

Think of it like this:
- ✅ Code is written and committed to GitHub (DONE)
- ❌ Code must be deployed to Firebase servers (NOT DONE)
- ⏳ After deployment, notifications will work (PENDING)

**You MUST run the deployment command for notifications to work!**

---

Last Updated: 2026-01-04
