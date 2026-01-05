import { 
  Firestore, 
  collection, 
  addDoc, 
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import type { Settlement } from '@/lib/types';
import { notifyUsers } from '@/lib/notifications';

/**
 * Create a new settlement in the shared settlements collection
 */
export async function createSettlement(
  firestore: Firestore,
  userId: string,
  settlementData: Omit<Settlement, 'id'>
): Promise<string> {
  const settlementsRef = collection(firestore, 'settlements');
  
  const docRef = await addDoc(settlementsRef, {
    ...settlementData,
    createdAt: serverTimestamp(),
  });
  
  // Send notification to the recipient
  try {
    if (settlementData.fromId && settlementData.toId) {
      console.log('🔔 [createSettlement] Settlement created:', {
        settlementId: docRef.id,
        fromId: settlementData.fromId,
        toId: settlementData.toId,
        amount: settlementData.amount
      });
      
      // Get payer name
      const payerDoc = await getDoc(doc(firestore, 'users', settlementData.fromId));
      const payerName = payerDoc.exists() ? payerDoc.data()?.name || 'Someone' : 'Someone';
      
      console.log(`📢 [createSettlement] Notifying recipient (${settlementData.toId}) about settlement by ${payerName}`);
      
      // Notify the recipient
      notifyUsers(firestore, [settlementData.toId], {
        title: '✅ Payment Received',
        body: `${payerName} settled up $${settlementData.amount.toFixed(2)} with you`,
        data: {
          type: 'settlement',
          url: '/settle',
          itemId: docRef.id,
        },
      }).catch(err => {
        console.error('❌ [createSettlement] Failed to send notification:', err);
      });
    } else {
      console.log('⚠️ [createSettlement] Missing fromId or toId, skipping notification');
    }
  } catch (error) {
    console.error('❌ [createSettlement] Error sending settlement notification:', error);
    // Don't fail the settlement creation if notification fails
  }
  
  return docRef.id;
}

/**
 * Update an existing settlement
 * Only the user who paid can update their settlement
 */
export async function updateSettlement(
  firestore: Firestore,
  settlementId: string,
  updates: Partial<Omit<Settlement, 'id' | 'type' | 'fromId'>>
): Promise<void> {
  try {
    const settlementRef = doc(firestore, `settlements/${settlementId}`);
    
    // Get current settlement data for notifications
    const currentSettlementSnap = await getDoc(settlementRef);
    const beforeData = currentSettlementSnap.exists() ? currentSettlementSnap.data() : null;
    
    await updateDoc(settlementRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    // Send notifications
    if (beforeData && beforeData.fromId && beforeData.toId) {
      // Type guard to ensure fromId and toId exist from beforeData
      const fromId = beforeData.fromId;
      const toId = beforeData.toId;
      
      console.log('🔔 [updateSettlement] Settlement updated:', {
        settlementId: settlementId,
        fromId: fromId,
        toId: toId,
        beforeAmount: beforeData.amount,
        afterAmount: updates.amount !== undefined ? updates.amount : beforeData.amount
      });
      
      // Get payer name
      const payerDoc = await getDoc(doc(firestore, 'users', fromId));
      const payerName = payerDoc.exists() ? payerDoc.data()?.name || 'Someone' : 'Someone';
      
      // Build change description
      const afterAmount = updates.amount !== undefined ? updates.amount : beforeData.amount;
      let changeDescription = '';
      if (beforeData.amount !== afterAmount && typeof afterAmount === 'number' && typeof beforeData.amount === 'number') {
        changeDescription = ` (amount changed from $${beforeData.amount.toFixed(2)} to $${afterAmount.toFixed(2)})`;
      } else {
        changeDescription = ' (details updated)';
      }
      
      console.log(`📢 [updateSettlement] Notifying recipient (${toId}) about settlement update by ${payerName}`);
      
      notifyUsers(firestore, [toId], {
        title: '✏️ Settlement Updated',
        body: `${payerName} updated a settlement with you${changeDescription}`,
        data: {
          type: 'settlement_updated',
          url: '/settle',
          itemId: settlementId,
        },
      }).catch(err => {
        console.error('❌ [updateSettlement] Failed to send notification:', err);
      });
    } else {
      console.log('ℹ️ [updateSettlement] No notification sent (missing beforeData or user IDs)');
    }
  } catch (error: any) {
    // Check for Firebase permission denied error
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      throw new Error('PERMISSION_DENIED: You can only modify your own settlements.');
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Delete a settlement
 * Only the user who paid can delete their settlement
 */
export async function deleteSettlement(
  firestore: Firestore,
  settlementId: string
): Promise<void> {
  try {
    const settlementRef = doc(firestore, `settlements/${settlementId}`);
    
    // Get settlement data before deletion for notifications
    const settlementSnap = await getDoc(settlementRef);
    const settlementData = settlementSnap.exists() ? settlementSnap.data() : null;
    
    await deleteDoc(settlementRef);
    
    // Send notifications
    if (settlementData && settlementData.fromId && settlementData.toId) {
      console.log('🔔 [deleteSettlement] Settlement deleted:', {
        settlementId: settlementId,
        fromId: settlementData.fromId,
        toId: settlementData.toId,
        amount: settlementData.amount
      });
      
      // Get payer name
      const payerDoc = await getDoc(doc(firestore, 'users', settlementData.fromId));
      const payerName = payerDoc.exists() ? payerDoc.data()?.name || 'Someone' : 'Someone';
      
      const amount = typeof settlementData.amount === 'number' ? settlementData.amount.toFixed(2) : '0.00';
      
      console.log(`📢 [deleteSettlement] Notifying recipient (${settlementData.toId}) about settlement deletion by ${payerName}`);
      
      notifyUsers(firestore, [settlementData.toId], {
        title: '🗑️ Settlement Deleted',
        body: `${payerName} removed a settlement of $${amount}`,
        data: {
          type: 'settlement_deleted',
          url: '/settle',
          itemId: settlementId,
        },
      }).catch(err => {
        console.error('❌ [deleteSettlement] Failed to send notification:', err);
      });
    } else {
      console.log('ℹ️ [deleteSettlement] No notification sent (missing settlement data or user IDs)');
    }
  } catch (error: any) {
    // Check for Firebase permission denied error
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      throw new Error('PERMISSION_DENIED: You can only modify your own settlements.');
    }
    // Re-throw other errors
    throw error;
  }
}
