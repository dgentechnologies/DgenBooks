# Push Notifications Implementation Guide

## Overview

This document describes the complete Firebase Cloud Messaging (FCM) push notification system implemented for DgenBooks. The system provides real-time notifications for team expenses, purchase requests, and settlements on both mobile (Android/iOS) and desktop platforms.

## Architecture

### Components

1. **Service Worker** (`public/firebase-messaging-sw.js`)
   - Handles background push notifications
   - Displays rich notifications with custom styling
   - Manages notification clicks and navigation

2. **Notification Hook** (`src/hooks/useNotificationToken.ts`)
   - Manages FCM token lifecycle
   - Requests and stores notification permissions
   - Handles foreground messages
   - Supports multi-device token management

3. **Permission Dialog** (`src/components/notification-permission-dialog.tsx`)
   - Soft prompt modal shown before browser permission request
   - Professional UX to avoid "pop-up fatigue"
   - Clear explanation of notification benefits

4. **Settings Integration** (`src/app/(app)/settings/page.tsx`)
   - Toggle for enabling/disabling notifications
   - Shows current permission status
   - Allows users to manage notifications anytime

5. **Cloud Functions** (`functions/src/index.ts`)
   - Server-side notification triggers
   - Sends notifications for key events
   - Manages token cleanup for invalid devices

## Setup Instructions

### 1. Generate VAPID Key

You need to generate a VAPID key for web push notifications:

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project (dgenbooks)
3. Go to Project Settings > Cloud Messaging
4. Under "Web Push certificates", click "Generate key pair"
5. Copy the key and replace the placeholder in `src/hooks/useNotificationToken.ts`:

```typescript
const VAPID_KEY = 'YOUR_GENERATED_VAPID_KEY_HERE';
```

**Security Note:** The VAPID key is currently hardcoded in the hook. For production use, consider:
- Moving it to an environment variable (e.g., `NEXT_PUBLIC_FIREBASE_VAPID_KEY`)
- Loading it from Firebase Remote Config
- Using a secure configuration management system

The current implementation is acceptable for initial deployment but should be improved for production security best practices.

### 2. Install Cloud Functions Dependencies

```bash
cd functions
npm install
```

### 3. Deploy Cloud Functions

```bash
# Build functions
npm run build

# Deploy to Firebase
npm run deploy
```

Or use Firebase CLI:
```bash
firebase deploy --only functions
```

### 4. Update Firestore Security Rules

Make sure your `firestore.rules` file allows the Cloud Functions to write FCM tokens:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
      
      // Allow Cloud Functions to update tokens
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['fcmTokens', 'lastTokenUpdate']);
    }
  }
}
```

## User Experience Flow

### First Time Setup

1. User navigates to Settings page
2. User sees "Push Notifications" toggle (disabled by default)
3. User toggles notifications ON
4. **Soft prompt modal appears** with benefits explanation
5. User clicks "Enable Notifications"
6. **Browser native permission prompt appears**
7. User grants permission
8. FCM token is generated and saved to Firestore
9. User receives confirmation toast
10. Toggle shows as enabled

### Notification Events

#### 1. New Expense Added
- **Trigger**: When a team member creates a new expense
- **Recipients**: All users in the expense split (except creator)
- **Message**: "{Name} paid ${amount} for {item}"
- **Action**: Clicking opens the expense log

#### 2. Urgent Purchase Request
- **Trigger**: When a high-priority purchase request is created
- **Recipients**: All team members (except requester)
- **Message**: "{Name} needs {item} urgently (~${cost})"
- **Action**: Clicking opens the requests page

#### 3. Settlement Payment
- **Trigger**: When someone settles a debt
- **Recipients**: The user who receives the payment
- **Message**: "{Name} settled up ${amount} with you"
- **Action**: Clicking opens the settlement page

## Technical Details

### Rich Notification Features

- **Icon**: High-res app logo (192x192px)
- **Badge**: Monochrome icon for Android status bar
- **Vibration**: Subtle pattern [200ms, 100ms, 200ms]
- **Click Action**: Opens/focuses PWA and navigates to relevant page
- **Grouping**: Notifications are grouped by type using tags

### Multi-Device Support

- FCM tokens are stored as an array in user documents
- Each device gets its own token
- Tokens are automatically cleaned up when invalid
- Users can enable notifications on multiple devices

### Token Management

```typescript
// User document structure
{
  id: "user123",
  name: "John Doe",
  fcmTokens: [
    "token_from_phone",
    "token_from_desktop",
    "token_from_tablet"
  ],
  lastTokenUpdate: "2024-01-15T10:30:00Z"
}
```

### Foreground vs Background

- **Foreground**: When app is open, shows toast notification
- **Background**: Service worker handles and shows OS notification
- Both cases support click navigation

## Testing

### Test Notifications Locally

1. Start the app:
```bash
npm run dev
```

2. Open in browser and enable notifications in Settings

3. Test with Firebase Console:
   - Go to Cloud Messaging in Firebase Console
   - Send a test message to your device token
   - Verify notification appearance and click action

4. Test Cloud Functions:
```bash
cd functions
npm run serve
```

Then create test documents in Firestore to trigger functions.

### Test on Mobile

1. Install PWA on mobile device
2. Enable notifications in Settings
3. Background the app
4. Trigger a notification event
5. Verify notification appears and click works

## Browser Support

- ✅ Chrome (Android & Desktop)
- ✅ Edge (Desktop)
- ✅ Firefox (Desktop)
- ✅ Safari (macOS 16.4+, iOS 16.4+)
- ✅ Samsung Internet
- ✅ Opera

## Troubleshooting

### Notifications not appearing

1. Check browser console for errors
2. Verify VAPID key is correct
3. Check Notification permission in browser settings
4. Verify service worker is registered
5. Check FCM token is saved in Firestore

### Service Worker not registering

1. Ensure HTTPS (required for service workers)
2. Check service worker file is in `/public` directory
3. Clear browser cache and re-register
4. Check browser console for registration errors

### Cloud Functions not triggering

1. Verify functions are deployed: `firebase functions:list`
2. Check function logs: `firebase functions:log`
3. Verify Firestore triggers are set up correctly
4. Check user has FCM tokens in Firestore

## Security Considerations

1. **Token Storage**: FCM tokens are stored securely in Firestore
2. **Permission**: Only authenticated users can receive notifications
3. **Token Cleanup**: Invalid tokens are automatically removed
4. **Data Privacy**: No sensitive data in notification content
5. **User Control**: Users can disable notifications anytime

## Future Enhancements

- [ ] Notification preferences (which events to receive)
- [ ] Notification sound customization
- [ ] Rich media in notifications (images)
- [ ] Action buttons (Approve/Deny for requests)
- [ ] Notification history in app
- [ ] Email fallback for critical notifications
- [ ] Scheduled notifications (reminders)

## API Reference

### `useNotificationToken()` Hook

```typescript
const {
  permission,      // Current permission state
  token,           // Current FCM token
  isSupported,     // Browser support status
  isLoading,       // Loading state
  error,           // Error message if any
  requestPermission,  // Function to request permission
  revokePermission,   // Function to disable notifications
} = useNotificationToken();
```

### Cloud Function: `sendNotificationToUser()`

```typescript
await sendNotificationToUser(
  userId: string,
  notification: {
    title: string;
    body: string;
  },
  data: {
    type: string;
    url: string;
    itemId?: string;
  }
);
```

## Support

For issues or questions:
1. Check browser console for errors
2. Review Firebase Console for function logs
3. Verify all setup steps are completed
4. Test with Firebase Console test messaging

## Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications Guide](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
