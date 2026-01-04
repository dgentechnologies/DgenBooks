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

/**
 * Cloud Function: Triggered when an expense (purchase) is updated
 * Notifies all team members except the one who updated it
 */
export const onPurchaseUpdated = functions.firestore
  .document('purchases/{purchaseId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const purchaseId = context.params.purchaseId;

    console.log('Purchase updated:', purchaseId);

    try {
      // Get the user who updated
      const updaterDoc = await admin.firestore().collection('users').doc(afterData.paidById).get();
      const updaterName = updaterDoc.exists ? updaterDoc.data()?.name || 'Someone' : 'Someone';

      // Get all users who are split with (excluding the updater)
      const usersToNotify = (afterData.splitWith || []).filter((userId: string) => userId !== afterData.paidById);

      // Build a description of what changed
      let changeDescription = '';
      if (beforeData.amount !== afterData.amount) {
        changeDescription = ` (amount changed from $${beforeData.amount.toFixed(2)} to $${afterData.amount.toFixed(2)})`;
      } else if (beforeData.itemName !== afterData.itemName) {
        changeDescription = ` (item name changed)`;
      } else {
        changeDescription = ' (details updated)';
      }

      // Send notification to each user
      const notificationPromises = usersToNotify.map((userId: string) => {
        return sendNotificationToUser(
          userId,
          {
            title: '✏️ Expense Updated',
            body: `${updaterName} updated expense: ${afterData.itemName}${changeDescription}`,
          },
          {
            type: 'expense_updated',
            url: '/log',
            itemId: purchaseId,
          }
        );
      });

      await Promise.all(notificationPromises);
      console.log(`Sent update notifications for purchase ${purchaseId}`);
    } catch (error) {
      console.error('Error processing purchase update notification:', error);
    }
  });

/**
 * Cloud Function: Triggered when an expense (purchase) is deleted
 * Notifies all team members who were involved except the one who deleted it
 */
export const onPurchaseDeleted = functions.firestore
  .document('purchases/{purchaseId}')
  .onDelete(async (snapshot, context) => {
    const purchase = snapshot.data();
    const purchaseId = context.params.purchaseId;

    console.log('Purchase deleted:', purchaseId);

    try {
      // Get the user who paid (and likely deleted)
      const deleterDoc = await admin.firestore().collection('users').doc(purchase.paidById).get();
      const deleterName = deleterDoc.exists ? deleterDoc.data()?.name || 'Someone' : 'Someone';

      // Get all users who were split with (excluding the deleter)
      const usersToNotify = (purchase.splitWith || []).filter((userId: string) => userId !== purchase.paidById);

      // Send notification to each user
      const notificationPromises = usersToNotify.map((userId: string) => {
        return sendNotificationToUser(
          userId,
          {
            title: '🗑️ Expense Deleted',
            body: `${deleterName} deleted expense: ${purchase.itemName} ($${purchase.amount.toFixed(2)})`,
          },
          {
            type: 'expense_deleted',
            url: '/log',
            itemId: purchaseId,
          }
        );
      });

      await Promise.all(notificationPromises);
      console.log(`Sent delete notifications for purchase ${purchaseId}`);
    } catch (error) {
      console.error('Error processing purchase delete notification:', error);
    }
  });

/**
 * Cloud Function: Triggered when a settlement is updated
 * Notifies both parties involved
 */
export const onSettlementUpdated = functions.firestore
  .document('settlements/{settlementId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const settlementId = context.params.settlementId;

    console.log('Settlement updated:', settlementId);

    try {
      // Get the user who paid
      const payerDoc = await admin.firestore().collection('users').doc(afterData.fromId).get();
      const payerName = payerDoc.exists ? payerDoc.data()?.name || 'Someone' : 'Someone';

      // Build a description of what changed
      let changeDescription = '';
      if (beforeData.amount !== afterData.amount) {
        changeDescription = ` (amount changed from $${beforeData.amount.toFixed(2)} to $${afterData.amount.toFixed(2)})`;
      } else {
        changeDescription = ' (details updated)';
      }

      // Notify the receiver (toId)
      await sendNotificationToUser(
        afterData.toId,
        {
          title: '✏️ Settlement Updated',
          body: `${payerName} updated a settlement with you${changeDescription}`,
        },
        {
          type: 'settlement_updated',
          url: '/settle',
          itemId: settlementId,
        }
      );

      console.log(`Sent settlement update notification for ${settlementId}`);
    } catch (error) {
      console.error('Error processing settlement update notification:', error);
    }
  });

/**
 * Cloud Function: Triggered when a settlement is deleted
 * Notifies the user who was supposed to receive the payment
 */
export const onSettlementDeleted = functions.firestore
  .document('settlements/{settlementId}')
  .onDelete(async (snapshot, context) => {
    const settlement = snapshot.data();
    const settlementId = context.params.settlementId;

    console.log('Settlement deleted:', settlementId);

    try {
      // Get the user who paid (and likely deleted)
      const payerDoc = await admin.firestore().collection('users').doc(settlement.fromId).get();
      const payerName = payerDoc.exists ? payerDoc.data()?.name || 'Someone' : 'Someone';

      // Notify the user who was supposed to receive the payment
      await sendNotificationToUser(
        settlement.toId,
        {
          title: '🗑️ Settlement Deleted',
          body: `${payerName} removed a settlement of $${settlement.amount.toFixed(2)}`,
        },
        {
          type: 'settlement_deleted',
          url: '/settle',
          itemId: settlementId,
        }
      );

      console.log(`Sent settlement delete notification for ${settlementId}`);
    } catch (error) {
      console.error('Error processing settlement delete notification:', error);
    }
  });
