import { Firestore, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Helper to get FCM tokens for multiple users
 */
export async function getUserTokens(
  firestore: Firestore,
  userIds: string[]
): Promise<Map<string, string[]>> {
  console.log(`🔍 [getUserTokens] Fetching tokens for ${userIds.length} user(s):`, userIds);
  const tokenMap = new Map<string, string[]>();

  if (!userIds || userIds.length === 0) {
    console.log('⚠️ [getUserTokens] No user IDs provided');
    return tokenMap;
  }

  try {
    // Get user documents for all user IDs
    const usersRef = collection(firestore, 'users');
    
    // Firestore 'in' query has a limit of 10 items, so we need to batch if needed
    const batchSize = 10;
    let totalTokensFound = 0;
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      console.log(`  📦 [getUserTokens] Processing batch ${Math.floor(i/batchSize) + 1}: ${batch.length} user(s)`);
      
      const q = query(usersRef, where('__name__', 'in', batch));
      const snapshot = await getDocs(q);
      
      console.log(`  📄 [getUserTokens] Retrieved ${snapshot.size} user document(s) from Firestore`);
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fcmTokens && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
          tokenMap.set(doc.id, data.fcmTokens);
          totalTokensFound += data.fcmTokens.length;
          console.log(`  ✅ [getUserTokens] User ${doc.id}: ${data.fcmTokens.length} token(s) found`);
        } else {
          console.log(`  ⚠️ [getUserTokens] User ${doc.id}: No FCM tokens found`);
        }
      });
    }
    
    console.log(`✅ [getUserTokens] Complete: Found ${totalTokensFound} token(s) across ${tokenMap.size} user(s)`);
  } catch (error) {
    console.error('❌ [getUserTokens] Error getting user tokens:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
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
  console.log('📤 [sendNotification] Preparing to send notification:', {
    tokensCount: params.tokens.length,
    title: params.title,
    bodyPreview: params.body.substring(0, 50),
    dataKeys: params.data ? Object.keys(params.data) : []
  });
  
  try {
    console.log('🌐 [sendNotification] Making POST request to /api/send-notification...');
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

    console.log(`📡 [sendNotification] API responded with status: ${response.status}`);
    
    const result = await response.json();
    console.log('📨 [sendNotification] API response:', result);
    
    if (!result.success) {
      console.error('❌ [sendNotification] Failed to send notification:', result.error);
      return false;
    }

    console.log(`✅ [sendNotification] Notification sent successfully: ${result.successCount} success, ${result.failureCount} failures`);
    
    if (result.failureCount > 0 && result.failedTokens?.length > 0) {
      console.warn(`⚠️ [sendNotification] Failed tokens:`, result.failedTokens.map((t: string) => t.substring(0, 20) + '...'));
    }
    
    return true;
  } catch (error) {
    console.error('❌ [sendNotification] Error sending notification:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
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
  console.log('🔔 [notifyUsers] Starting notification process:', {
    userIdsCount: userIds.length,
    userIds: userIds,
    title: notification.title,
    bodyPreview: notification.body.substring(0, 50)
  });
  
  if (!userIds || userIds.length === 0) {
    console.log('⚠️ [notifyUsers] No user IDs provided, skipping notification');
    return;
  }

  try {
    // Get tokens for all users
    const tokenMap = await getUserTokens(firestore, userIds);
    
    // Collect all tokens
    const allTokens: string[] = [];
    tokenMap.forEach((tokens, userId) => {
      console.log(`  📱 [notifyUsers] User ${userId}: Adding ${tokens.length} token(s)`);
      allTokens.push(...tokens);
    });

    if (allTokens.length === 0) {
      console.warn('⚠️ [notifyUsers] No FCM tokens found for users:', userIds);
      console.warn('Users may not have notification permissions enabled or haven\'t logged in on a device.');
      return;
    }

    console.log(`✅ [notifyUsers] Collected ${allTokens.length} token(s), proceeding to send notification...`);

    // Send notification
    const success = await sendNotification({
      tokens: allTokens,
      title: notification.title,
      body: notification.body,
      data: notification.data,
    });
    
    if (success) {
      console.log('✅ [notifyUsers] Notification process completed successfully');
    } else {
      console.error('❌ [notifyUsers] Notification process completed with errors');
    }
  } catch (error) {
    console.error('❌ [notifyUsers] Error notifying users:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
  }
}
