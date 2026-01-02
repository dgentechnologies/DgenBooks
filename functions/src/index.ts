import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Helper function to send FCM notifications to users
 */
async function sendNotificationToUser(
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
): Promise<void> {
  try {
    // Get user document to retrieve FCM tokens
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return;
    }

    const userData = userDoc.data();
    const fcmTokens = userData?.fcmTokens || [];

    if (fcmTokens.length === 0) {
      console.log(`User ${userId} has no FCM tokens`);
      return;
    }

    // Prepare the message
    const message = {
      notification,
      data: {
        ...data,
        itemId: data.itemId || '',
      },
      tokens: fcmTokens,
    };

    // Send the notification
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`Sent notification to user ${userId}:`, response.successCount, 'success,', response.failureCount, 'failures');

    // Remove invalid tokens
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          tokensToRemove.push(fcmTokens[idx]);
        }
      });

      if (tokensToRemove.length > 0) {
        await admin.firestore().collection('users').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
        });
        console.log(`Removed ${tokensToRemove.length} invalid tokens for user ${userId}`);
      }
    }
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
  }
}

/**
 * Cloud Function: Triggered when a new expense (purchase) is created
 * Notifies all team members except the one who created it
 */
export const onPurchaseCreated = functions.firestore
  .document('purchases/{purchaseId}')
  .onCreate(async (snapshot, context) => {
    const purchase = snapshot.data();
    const purchaseId = context.params.purchaseId;

    console.log('New purchase created:', purchaseId);

    try {
      // Get the user who paid
      const payerDoc = await admin.firestore().collection('users').doc(purchase.paidById).get();
      const payerName = payerDoc.exists ? payerDoc.data()?.name || 'Someone' : 'Someone';

      // Get all users who are split with (excluding the payer)
      // Safely handle the case where splitWith might be undefined or null
      const usersToNotify = (purchase.splitWith || []).filter((userId: string) => userId !== purchase.paidById);

      // Send notification to each user
      const notificationPromises = usersToNotify.map((userId: string) => {
        return sendNotificationToUser(
          userId,
          {
            title: '💳 New Expense Added',
            body: `${payerName} paid $${purchase.amount.toFixed(2)} for ${purchase.itemName}`,
          },
          {
            type: 'expense',
            url: '/log',
            itemId: purchaseId,
          }
        );
      });

      await Promise.all(notificationPromises);
      console.log(`Sent notifications for purchase ${purchaseId}`);
    } catch (error) {
      console.error('Error processing purchase notification:', error);
    }
  });

/**
 * Cloud Function: Triggered when a new purchase request is created
 * Notifies admins/team members based on priority
 */
export const onPurchaseRequestCreated = functions.firestore
  .document('purchaseRequests/{requestId}')
  .onCreate(async (snapshot, context) => {
    const request = snapshot.data();
    const requestId = context.params.requestId;

    console.log('New purchase request created:', requestId);

    try {
      // Get the user who made the request
      const requesterDoc = await admin.firestore().collection('users').doc(request.requestedBy).get();
      const requesterName = requesterDoc.exists ? requesterDoc.data()?.name || 'Someone' : 'Someone';

      // For urgent requests, notify all users; for standard, notify only admins
      // Since we don't have a role system, we'll notify all users for urgent requests
      if (request.priority === 'Urgent') {
        // Get all users except the requester
        const usersSnapshot = await admin.firestore().collection('users').get();
        const usersToNotify = usersSnapshot.docs
          .map(doc => doc.id)
          .filter(userId => userId !== request.requestedBy);

        const notificationPromises = usersToNotify.map((userId: string) => {
          const costText = request.estimatedCost ? ` (~$${request.estimatedCost.toFixed(2)})` : '';
          return sendNotificationToUser(
            userId,
            {
              title: '🚨 Urgent Purchase Request',
              body: `${requesterName} needs ${request.itemName} urgently${costText}`,
            },
            {
              type: 'urgent_request',
              url: '/requests',
              itemId: requestId,
            }
          );
        });

        await Promise.all(notificationPromises);
        console.log(`Sent urgent request notifications for ${requestId}`);
      }
    } catch (error) {
      console.error('Error processing purchase request notification:', error);
    }
  });

/**
 * Cloud Function: Triggered when a new settlement is created
 * Notifies the user who receives the payment
 */
export const onSettlementCreated = functions.firestore
  .document('settlements/{settlementId}')
  .onCreate(async (snapshot, context) => {
    const settlement = snapshot.data();
    const settlementId = context.params.settlementId;

    console.log('New settlement created:', settlementId);

    try {
      // Get the user who paid
      const payerDoc = await admin.firestore().collection('users').doc(settlement.fromId).get();
      const payerName = payerDoc.exists ? payerDoc.data()?.name || 'Someone' : 'Someone';

      // Notify the user who received the payment
      await sendNotificationToUser(
        settlement.toId,
        {
          title: '✅ Payment Received',
          body: `${payerName} settled up $${settlement.amount.toFixed(2)} with you`,
        },
        {
          type: 'settlement',
          url: '/settle',
          itemId: settlementId,
        }
      );

      console.log(`Sent settlement notification for ${settlementId}`);
    } catch (error) {
      console.error('Error processing settlement notification:', error);
    }
  });
