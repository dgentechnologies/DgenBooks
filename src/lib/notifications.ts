import { Firestore, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Helper to get FCM tokens for multiple users
 */
export async function getUserTokens(
  firestore: Firestore,
  userIds: string[]
): Promise<Map<string, string[]>> {
  const tokenMap = new Map<string, string[]>();

  if (!userIds || userIds.length === 0) {
    return tokenMap;
  }

  try {
    // Get user documents for all user IDs
    const usersRef = collection(firestore, 'users');
    
    // Firestore 'in' query has a limit of 10 items, so we need to batch if needed
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const q = query(usersRef, where('__name__', 'in', batch));
      const snapshot = await getDocs(q);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fcmTokens && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
          tokenMap.set(doc.id, data.fcmTokens);
        }
      });
    }
  } catch (error) {
    console.error('Error getting user tokens:', error);
  }

  return tokenMap;
}

/**
 * Send notification via Vercel API route
 */
export async function sendNotification(params: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<boolean> {
  try {
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokens: params.tokens,
        title: params.title,
        body: params.body,
        data: params.data,
      }),
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('Failed to send notification:', result.error);
      return false;
    }

    console.log(`Notification sent: ${result.successCount} success, ${result.failureCount} failures`);
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Send notifications to multiple users
 */
export async function notifyUsers(
  firestore: Firestore,
  userIds: string[],
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<void> {
  if (!userIds || userIds.length === 0) {
    return;
  }

  try {
    // Get tokens for all users
    const tokenMap = await getUserTokens(firestore, userIds);
    
    // Collect all tokens
    const allTokens: string[] = [];
    tokenMap.forEach((tokens) => {
      allTokens.push(...tokens);
    });

    if (allTokens.length === 0) {
      console.log('No FCM tokens found for users:', userIds);
      return;
    }

    // Send notification
    await sendNotification({
      tokens: allTokens,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    });
  } catch (error) {
    console.error('Error notifying users:', error);
  }
}
