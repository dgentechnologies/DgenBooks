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
import type { Purchase } from '@/lib/types';
import { notifyUsers } from '@/lib/notifications';

/**
 * Create a new purchase in the shared purchases collection
 */
export async function createPurchase(
  firestore: Firestore,
  userId: string,
  purchaseData: Omit<Purchase, 'id'>
): Promise<string> {
  const purchasesRef = collection(firestore, 'purchases');
  
  const docRef = await addDoc(purchasesRef, {
    ...purchaseData,
    createdAt: serverTimestamp(),
  });
  
  // Send notifications to other users in the split (excluding the payer(s))
  try {
    // Get all payers (single or multiple)
    const allPayers = purchaseData.paymentType === 'multiple' && purchaseData.paidByAmounts
      ? Object.keys(purchaseData.paidByAmounts)
      : [purchaseData.paidById];
    
    const usersToNotify = (purchaseData.splitWith || []).filter(
      (id: string) => !allPayers.includes(id)
    );
    
    console.log('🔔 [createPurchase] Expense created:', {
      purchaseId: docRef.id,
      paidById: purchaseData.paidById,
      paymentType: purchaseData.paymentType,
      paidByAmounts: purchaseData.paidByAmounts,
      amount: purchaseData.amount,
      itemName: purchaseData.itemName,
      splitWith: purchaseData.splitWith,
      usersToNotify: usersToNotify
    });
    
    if (usersToNotify.length > 0) {
      // Get payer name(s)
      let payerDescription = '';
      if (purchaseData.paymentType === 'multiple' && purchaseData.paidByAmounts) {
        const payerNames = await Promise.all(
          Object.keys(purchaseData.paidByAmounts).map(async (payerId) => {
            const payerDoc = await getDoc(doc(firestore, 'users', payerId));
            return payerDoc.exists() ? payerDoc.data()?.name || 'Someone' : 'Someone';
          })
        );
        payerDescription = payerNames.length > 1 
          ? `${payerNames.slice(0, -1).join(', ')} and ${payerNames[payerNames.length - 1]}`
          : payerNames[0] || 'Multiple users';
      } else {
        const payerDoc = await getDoc(doc(firestore, 'users', purchaseData.paidById));
        payerDescription = payerDoc.exists() ? payerDoc.data()?.name || 'Someone' : 'Someone';
      }
      
      console.log(`📢 [createPurchase] Notifying ${usersToNotify.length} user(s) about new expense by ${payerDescription}`);
      
      // Send notification
      notifyUsers(firestore, usersToNotify, {
        title: '💳 New Expense Added',
        body: `${payerDescription} paid ₹${purchaseData.amount.toFixed(2)} for ${purchaseData.itemName}`,
        data: {
          type: 'expense',
          url: '/log',
          itemId: docRef.id,
        },
      }).catch(err => {
        console.error('❌ [createPurchase] Failed to send notification:', err);
      });
    } else {
      console.log('ℹ️ [createPurchase] No users to notify (no other users in split or only payer)');
    }
  } catch (error) {
    console.error('❌ [createPurchase] Error sending purchase notification:', error);
    // Don't fail the purchase creation if notification fails
  }
  
  return docRef.id;
}

/**
 * Update an existing purchase
 * For single-payer: Only the user who paid can update
 * For multi-payer: Any of the payers can update
 */
export async function updatePurchase(
  firestore: Firestore,
  userId: string,
  purchaseId: string,
  updates: Partial<Omit<Purchase, 'id' | 'type' | 'paidById' | 'paymentType'>>
): Promise<void> {
  try {
    const purchaseRef = doc(firestore, `purchases/${purchaseId}`);
    
    // Get current purchase data for notifications
    const currentPurchaseSnap = await getDoc(purchaseRef);
    const beforeData = currentPurchaseSnap.exists() ? currentPurchaseSnap.data() : null;
    
    await updateDoc(purchaseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    
    // Send notifications
    if (beforeData) {
      const afterData = { ...beforeData, ...updates };
      const usersToNotify = (afterData.splitWith || []).filter(
        (id: string) => id !== beforeData.paidById
      );
      
      console.log('🔔 [updatePurchase] Expense updated:', {
        purchaseId: purchaseId,
        paidById: beforeData.paidById,
        beforeAmount: beforeData.amount,
        afterAmount: afterData.amount,
        itemName: afterData.itemName,
        usersToNotify: usersToNotify
      });
      
      if (usersToNotify.length > 0) {
        // Get updater name
        const updaterDoc = await getDoc(doc(firestore, 'users', beforeData.paidById));
        const updaterName = updaterDoc.exists() ? updaterDoc.data()?.name || 'Someone' : 'Someone';
        
        // Build change description
        let changeDescription = '';
        if (beforeData.amount !== afterData.amount && typeof afterData.amount === 'number' && typeof beforeData.amount === 'number') {
          changeDescription = ` (amount changed from ₹${beforeData.amount.toFixed(2)} to ₹${afterData.amount.toFixed(2)})`;
        } else if (beforeData.itemName !== afterData.itemName) {
          changeDescription = ` (item name changed)`;
        } else {
          changeDescription = ' (details updated)';
        }
        
        console.log(`📢 [updatePurchase] Notifying ${usersToNotify.length} user(s) about expense update by ${updaterName}`);
        
        notifyUsers(firestore, usersToNotify, {
          title: '✏️ Expense Updated',
          body: `${updaterName} updated expense: ${afterData.itemName || 'an expense'}${changeDescription}`,
          data: {
            type: 'expense_updated',
            url: '/log',
            itemId: purchaseId,
          },
        }).catch(err => {
          console.error('❌ [updatePurchase] Failed to send notification:', err);
        });
      } else {
        console.log('ℹ️ [updatePurchase] No users to notify');
      }
    }
  } catch (error: any) {
    // Check for Firebase permission denied error
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      throw new Error('PERMISSION_DENIED: You can only modify your own expenses.');
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Delete a purchase
 * Only the user who paid can delete their purchase
 */
export async function deletePurchase(
  firestore: Firestore,
  userId: string,
  purchaseId: string
): Promise<void> {
  try {
    const purchaseRef = doc(firestore, `purchases/${purchaseId}`);
    
    // Get purchase data before deletion for notifications
    const purchaseSnap = await getDoc(purchaseRef);
    const purchaseData = purchaseSnap.exists() ? purchaseSnap.data() : null;
    
    await deleteDoc(purchaseRef);
    
    // Send notifications
    if (purchaseData && purchaseData.paidById) {
      const usersToNotify = (purchaseData.splitWith || []).filter(
        (id: string) => id !== purchaseData.paidById
      );
      
      console.log('🔔 [deletePurchase] Expense deleted:', {
        purchaseId: purchaseId,
        paidById: purchaseData.paidById,
        amount: purchaseData.amount,
        itemName: purchaseData.itemName,
        usersToNotify: usersToNotify
      });
      
      if (usersToNotify.length > 0) {
        // Get deleter name
        const deleterDoc = await getDoc(doc(firestore, 'users', purchaseData.paidById));
        const deleterName = deleterDoc.exists() ? deleterDoc.data()?.name || 'Someone' : 'Someone';
        
        const amount = typeof purchaseData.amount === 'number' ? purchaseData.amount.toFixed(2) : '0.00';
        
        console.log(`📢 [deletePurchase] Notifying ${usersToNotify.length} user(s) about expense deletion by ${deleterName}`);
        
        notifyUsers(firestore, usersToNotify, {
          title: '🗑️ Expense Deleted',
          body: `${deleterName} deleted expense: ${purchaseData.itemName || 'an expense'} (₹${amount})`,
          data: {
            type: 'expense_deleted',
            url: '/log',
            itemId: purchaseId,
          },
        }).catch(err => {
          console.error('❌ [deletePurchase] Failed to send notification:', err);
        });
      } else {
        console.log('ℹ️ [deletePurchase] No users to notify');
      }
    }
  } catch (error: any) {
    // Check for Firebase permission denied error
    if (error?.code === 'permission-denied' || error?.code === 'PERMISSION_DENIED') {
      throw new Error('PERMISSION_DENIED: You can only modify your own expenses.');
    }
    // Re-throw other errors
    throw error;
  }
}
