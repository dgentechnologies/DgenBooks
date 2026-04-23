import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
admin.initializeApp();

const firestoreDatabaseId = process.env.FIREBASE_BOOKS_DATABASE_ID || '(default)';
const firestoreDb = getFirestore(firestoreDatabaseId);
const firestoreNamespace = functions.firestore.database(firestoreDatabaseId);

// Shared currency formatter instance for better performance
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Helper function to format currency in Indian Rupees
 */
function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

/**
 * Helper function to format cost text for notifications
 */
function formatCostText(cost: number | undefined | null): string {
  return typeof cost === 'number' ? ` (~${formatCurrency(cost)})` : '';
}

/**
 * Helper function to normalize cost values for comparison
 */
function normalizeCost(cost: number | undefined | null): number | null {
  return typeof cost === 'number' ? cost : null;
}

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
    const userDoc = await firestoreDb.collection('users').doc(userId).get();
    
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
        await firestoreDb.collection('users').doc(userId).update({
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
 * For company expenses, notifies all users
 */
export const onPurchaseCreated = firestoreNamespace
  .document('purchases/{purchaseId}')
  .onCreate(async (snapshot, context) => {
    const purchase = snapshot.data();
    const purchaseId = context.params.purchaseId;

    console.log('New purchase created:', purchaseId);

    try {
      // Handle company-paid expenses
      if (purchase.paidByCompany === true || purchase.paymentType === 'company') {
        console.log('Company-paid expense created:', purchaseId);
        
        // Get all users except the creator (we assume paidById is the creator for company expenses)
        const usersSnapshot = await firestoreDb.collection('users').get();
        const usersToNotify = usersSnapshot.docs
          .map(doc => doc.id)
          .filter(userId => userId !== purchase.paidById);
        
        if (usersToNotify.length === 0) {
          console.log(`No users to notify for company expense ${purchaseId}`);
          return;
        }
        
        // Get creator name
        const creatorDoc = await firestoreDb.collection('users').doc(purchase.paidById).get();
        const creatorName = creatorDoc.exists ? creatorDoc.data()?.name || 'Someone' : 'Someone';
        
        // Send notification to each user
        const notificationPromises = usersToNotify.map((userId: string) => {
          return sendNotificationToUser(
            userId,
            {
              title: '🏢 Company Expense Added',
              body: `${creatorName} logged a company expense: ${purchase.itemName} (${formatCurrency(purchase.amount)})`,
            },
            {
              type: 'company_expense',
              url: '/log',
              itemId: purchaseId,
            }
          );
        });

        await Promise.all(notificationPromises);
        console.log(`Sent company expense notifications for ${purchaseId}`);
        return;
      }
      
      // Regular expense handling
      // Get the user who paid
      const payerDoc = await firestoreDb.collection('users').doc(purchase.paidById).get();
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
            body: `${payerName} paid ${formatCurrency(purchase.amount)} for ${purchase.itemName}`,
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
 * Notifies all team members except the requester
 */
export const onPurchaseRequestCreated = firestoreNamespace
  .document('purchaseRequests/{requestId}')
  .onCreate(async (snapshot, context) => {
    const request = snapshot.data();
    const requestId = context.params.requestId;

    console.log('New purchase request created:', requestId);

    try {
      // Get the user who made the request
      const requesterDoc = await firestoreDb.collection('users').doc(request.requestedBy).get();
      const requesterName = requesterDoc.exists ? requesterDoc.data()?.name || 'Someone' : 'Someone';

      // Get all users except the requester
      const usersSnapshot = await firestoreDb.collection('users').get();
      const usersToNotify = usersSnapshot.docs
        .map(doc => doc.id)
        .filter(userId => userId !== request.requestedBy);

      if (usersToNotify.length === 0) {
        console.log(`No users to notify for purchase request ${requestId}`);
        return;
      }

      // Use different notification based on priority
      const isUrgent = request.priority === 'Urgent';
      const costText = formatCostText(request.estimatedCost);
      
      const notificationPromises = usersToNotify.map((userId: string) => {
        return sendNotificationToUser(
          userId,
          {
            title: isUrgent ? '🚨 Urgent Purchase Request' : '📝 New Purchase Request',
            body: isUrgent 
              ? `${requesterName} needs ${request.itemName} urgently${costText}`
              : `${requesterName} requested ${request.itemName}${costText}`,
          },
          {
            type: isUrgent ? 'urgent_request' : 'purchase_request',
            url: '/requests',
            itemId: requestId,
          }
        );
      });

      await Promise.all(notificationPromises);
      console.log(`Sent purchase request notifications for ${requestId}`);
    } catch (error) {
      console.error('Error processing purchase request notification:', error);
    }
  });

/**
 * Cloud Function: Triggered when a purchase request is updated
 * Notifies all team members except the one who updated it
 */
export const onPurchaseRequestUpdated = firestoreNamespace
  .document('purchaseRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const requestId = context.params.requestId;

    console.log('Purchase request updated:', requestId);

    try {
      // Validate required fields
      if (!afterData.requestedBy) {
        console.warn(`Purchase request ${requestId} missing requestedBy, skipping notification`);
        return;
      }

      // Get the user who made the original request
      // Note: We notify other users and exclude the original requester since we don't track who performs updates
      const requesterDoc = await firestoreDb.collection('users').doc(afterData.requestedBy).get();
      const requesterName = requesterDoc.exists ? requesterDoc.data()?.name || 'Someone' : 'Someone';

      // Get all users except the requester
      const usersSnapshot = await firestoreDb.collection('users').get();
      const usersToNotify = usersSnapshot.docs
        .map(doc => doc.id)
        .filter(userId => userId !== afterData.requestedBy);

      if (usersToNotify.length === 0) {
        console.log(`No users to notify for purchase request ${requestId}`);
        return;
      }

      // Build a description of what changed
      let changeDescription = '';
      if (beforeData.status !== afterData.status) {
        changeDescription = ` (status changed to ${afterData.status})`;
      } else if (beforeData.priority !== afterData.priority) {
        changeDescription = ` (priority changed to ${afterData.priority})`;
      } else if (beforeData.estimatedCost !== afterData.estimatedCost) {
        // Normalize null/undefined to null for consistent comparison
        const oldCost = normalizeCost(beforeData.estimatedCost);
        const newCost = normalizeCost(afterData.estimatedCost);
        
        // Only report change if there's an actual difference between the normalized values
        if (oldCost !== newCost) {
          if (oldCost !== null && newCost !== null) {
            changeDescription = ` (cost changed from ${formatCurrency(oldCost)} to ${formatCurrency(newCost)})`;
          } else if (newCost !== null) {
            changeDescription = ` (cost set to ${formatCurrency(newCost)})`;
          } else if (oldCost !== null) {
            changeDescription = ` (cost removed)`;
          }
        }
      } else if (beforeData.itemName !== afterData.itemName) {
        changeDescription = ` (item name changed)`;
      }
      
      // If we still don't have a change description, default to generic message
      if (!changeDescription) {
        changeDescription = ' (details updated)';
      }

      // Send notification to each user
      const notificationPromises = usersToNotify.map((userId: string) => {
        return sendNotificationToUser(
          userId,
          {
            title: '✏️ Purchase Request Updated',
            body: `${requesterName} updated request: ${afterData.itemName || 'a request'}${changeDescription}`,
          },
          {
            type: 'purchase_request_updated',
            url: '/requests',
            itemId: requestId,
          }
        );
      });

      await Promise.all(notificationPromises);
      console.log(`Sent update notifications for purchase request ${requestId}`);
    } catch (error) {
      console.error('Error processing purchase request update notification:', error);
    }
  });

/**
 * Cloud Function: Triggered when a purchase request is deleted
 * Notifies all team members except the one who created/deleted it
 */
export const onPurchaseRequestDeleted = firestoreNamespace
  .document('purchaseRequests/{requestId}')
  .onDelete(async (snapshot, context) => {
    const request = snapshot.data();
    const requestId = context.params.requestId;

    console.log('Purchase request deleted:', requestId);

    try {
      // Validate required fields
      if (!request.requestedBy) {
        console.warn(`Purchase request ${requestId} missing requestedBy, skipping notification`);
        return;
      }

      // Get the user who made the request
      const requesterDoc = await firestoreDb.collection('users').doc(request.requestedBy).get();
      const requesterName = requesterDoc.exists ? requesterDoc.data()?.name || 'Someone' : 'Someone';

      // Get all users except the requester
      const usersSnapshot = await firestoreDb.collection('users').get();
      const usersToNotify = usersSnapshot.docs
        .map(doc => doc.id)
        .filter(userId => userId !== request.requestedBy);

      if (usersToNotify.length === 0) {
        console.log(`No users to notify for purchase request ${requestId}`);
        return;
      }

      const costText = formatCostText(request.estimatedCost);

      // Send notification to each user
      const notificationPromises = usersToNotify.map((userId: string) => {
        return sendNotificationToUser(
          userId,
          {
            title: '🗑️ Purchase Request Deleted',
            body: `${requesterName} deleted request: ${request.itemName || 'a request'}${costText}`,
          },
          {
            type: 'purchase_request_deleted',
            url: '/requests',
            itemId: requestId,
          }
        );
      });

      await Promise.all(notificationPromises);
      console.log(`Sent delete notifications for purchase request ${requestId}`);
    } catch (error) {
      console.error('Error processing purchase request delete notification:', error);
    }
  });

/**
 * Cloud Function: Triggered when a new settlement is created
 * Notifies the user who receives the payment
 */
export const onSettlementCreated = firestoreNamespace
  .document('settlements/{settlementId}')
  .onCreate(async (snapshot, context) => {
    const settlement = snapshot.data();
    const settlementId = context.params.settlementId;

    console.log('New settlement created:', settlementId);

    try {
      // Get the user who paid
      const payerDoc = await firestoreDb.collection('users').doc(settlement.fromId).get();
      const payerName = payerDoc.exists ? payerDoc.data()?.name || 'Someone' : 'Someone';

      // Notify the user who received the payment
      await sendNotificationToUser(
        settlement.toId,
        {
          title: '✅ Payment Received',
          body: `${payerName} settled up ${formatCurrency(settlement.amount)} with you`,
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
 * For company expenses, notifies all users
 */
export const onPurchaseUpdated = firestoreNamespace
  .document('purchases/{purchaseId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const purchaseId = context.params.purchaseId;

    console.log('Purchase updated:', purchaseId);

    try {
      // Validate required fields
      if (!afterData.paidById) {
        console.warn(`Purchase ${purchaseId} missing paidById, skipping notification`);
        return;
      }

      // Handle company-paid expenses
      if (afterData.paidByCompany === true || afterData.paymentType === 'company') {
        console.log('Company expense updated:', purchaseId);
        
        // Get all users except the updater
        const usersSnapshot = await firestoreDb.collection('users').get();
        const usersToNotify = usersSnapshot.docs
          .map(doc => doc.id)
          .filter(userId => userId !== afterData.paidById);
        
        if (usersToNotify.length === 0) {
          console.log(`No users to notify for company expense ${purchaseId}`);
          return;
        }
        
        // Get updater name
        const updaterDoc = await firestoreDb.collection('users').doc(afterData.paidById).get();
        const updaterName = updaterDoc.exists ? updaterDoc.data()?.name || 'Someone' : 'Someone';
        
        // Build a description of what changed
        let changeDescription = '';
        if (beforeData.amount !== afterData.amount && typeof afterData.amount === 'number' && typeof beforeData.amount === 'number') {
          changeDescription = ` (amount changed from ${formatCurrency(beforeData.amount)} to ${formatCurrency(afterData.amount)})`;
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
              title: '✏️ Company Expense Updated',
              body: `${updaterName} updated company expense: ${afterData.itemName || 'an expense'}${changeDescription}`,
            },
            {
              type: 'company_expense_updated',
              url: '/log',
              itemId: purchaseId,
            }
          );
        });

        await Promise.all(notificationPromises);
        console.log(`Sent company expense update notifications for ${purchaseId}`);
        return;
      }

      // Regular expense handling
      // Get the user who updated
      const updaterDoc = await firestoreDb.collection('users').doc(afterData.paidById).get();
      const updaterName = updaterDoc.exists ? updaterDoc.data()?.name || 'Someone' : 'Someone';

      // Get all users who are split with (excluding the updater)
      const usersToNotify = (afterData.splitWith || []).filter((userId: string) => userId !== afterData.paidById);

      if (usersToNotify.length === 0) {
        console.log(`No users to notify for purchase ${purchaseId}`);
        return;
      }

      // Build a description of what changed
      let changeDescription = '';
      if (beforeData.amount !== afterData.amount && typeof afterData.amount === 'number' && typeof beforeData.amount === 'number') {
        changeDescription = ` (amount changed from ${formatCurrency(beforeData.amount)} to ${formatCurrency(afterData.amount)})`;
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
            body: `${updaterName} updated expense: ${afterData.itemName || 'an expense'}${changeDescription}`,
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
 * For company expenses, notifies all users
 */
export const onPurchaseDeleted = firestoreNamespace
  .document('purchases/{purchaseId}')
  .onDelete(async (snapshot, context) => {
    const purchase = snapshot.data();
    const purchaseId = context.params.purchaseId;

    console.log('Purchase deleted:', purchaseId);

    try {
      // Validate required fields
      if (!purchase.paidById) {
        console.warn(`Purchase ${purchaseId} missing paidById, skipping notification`);
        return;
      }

      // Handle company-paid expenses
      if (purchase.paidByCompany === true || purchase.paymentType === 'company') {
        console.log('Company expense deleted:', purchaseId);
        
        // Get all users except the deleter
        const usersSnapshot = await firestoreDb.collection('users').get();
        const usersToNotify = usersSnapshot.docs
          .map(doc => doc.id)
          .filter(userId => userId !== purchase.paidById);
        
        if (usersToNotify.length === 0) {
          console.log(`No users to notify for company expense ${purchaseId}`);
          return;
        }
        
        // Get deleter name
        const deleterDoc = await firestoreDb.collection('users').doc(purchase.paidById).get();
        const deleterName = deleterDoc.exists ? deleterDoc.data()?.name || 'Someone' : 'Someone';
        
        const amount = typeof purchase.amount === 'number' ? formatCurrency(purchase.amount) : formatCurrency(0);
        
        // Send notification to each user
        const notificationPromises = usersToNotify.map((userId: string) => {
          return sendNotificationToUser(
            userId,
            {
              title: '🗑️ Company Expense Deleted',
              body: `${deleterName} deleted company expense: ${purchase.itemName || 'an expense'} (${amount})`,
            },
            {
              type: 'company_expense_deleted',
              url: '/log',
              itemId: purchaseId,
            }
          );
        });

        await Promise.all(notificationPromises);
        console.log(`Sent company expense delete notifications for ${purchaseId}`);
        return;
      }

      // Regular expense handling
      // Get the user who paid for this expense
      const deleterDoc = await firestoreDb.collection('users').doc(purchase.paidById).get();
      const deleterName = deleterDoc.exists ? deleterDoc.data()?.name || 'Someone' : 'Someone';

      // Get all users who were split with (excluding the payer)
      const usersToNotify = (purchase.splitWith || []).filter((userId: string) => userId !== purchase.paidById);

      if (usersToNotify.length === 0) {
        console.log(`No users to notify for purchase ${purchaseId}`);
        return;
      }

      const amount = typeof purchase.amount === 'number' ? formatCurrency(purchase.amount) : formatCurrency(0);

      // Send notification to each user
      const notificationPromises = usersToNotify.map((userId: string) => {
        return sendNotificationToUser(
          userId,
          {
            title: '🗑️ Expense Deleted',
            body: `${deleterName} deleted expense: ${purchase.itemName || 'an expense'} (${amount})`,
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
export const onSettlementUpdated = firestoreNamespace
  .document('settlements/{settlementId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const settlementId = context.params.settlementId;

    console.log('Settlement updated:', settlementId);

    try {
      // Validate required fields
      if (!afterData.fromId || !afterData.toId) {
        console.warn(`Settlement ${settlementId} missing fromId or toId, skipping notification`);
        return;
      }

      // Get the user who paid
      const payerDoc = await firestoreDb.collection('users').doc(afterData.fromId).get();
      const payerName = payerDoc.exists ? payerDoc.data()?.name || 'Someone' : 'Someone';

      // Build a description of what changed
      let changeDescription = '';
      if (beforeData.amount !== afterData.amount && typeof afterData.amount === 'number' && typeof beforeData.amount === 'number') {
        changeDescription = ` (amount changed from ${formatCurrency(beforeData.amount)} to ${formatCurrency(afterData.amount)})`;
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
export const onSettlementDeleted = firestoreNamespace
  .document('settlements/{settlementId}')
  .onDelete(async (snapshot, context) => {
    const settlement = snapshot.data();
    const settlementId = context.params.settlementId;

    console.log('Settlement deleted:', settlementId);

    try {
      // Validate required fields
      if (!settlement.fromId || !settlement.toId) {
        console.warn(`Settlement ${settlementId} missing fromId or toId, skipping notification`);
        return;
      }

      // Get the user who made the payment
      const payerDoc = await firestoreDb.collection('users').doc(settlement.fromId).get();
      const payerName = payerDoc.exists ? payerDoc.data()?.name || 'Someone' : 'Someone';

      const amount = typeof settlement.amount === 'number' ? formatCurrency(settlement.amount) : formatCurrency(0);

      // Notify the user who was supposed to receive the payment
      await sendNotificationToUser(
        settlement.toId,
        {
          title: '🗑️ Settlement Deleted',
          body: `${payerName} removed a settlement of ${amount}`,
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
