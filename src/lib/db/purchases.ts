import { 
  Firestore, 
  collection, 
  addDoc, 
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import type { Purchase } from '@/lib/types';

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
  
  return docRef.id;
}

/**
 * Update an existing purchase
 * Only the user who paid can update their purchase
 */
export async function updatePurchase(
  firestore: Firestore,
  userId: string,
  purchaseId: string,
  updates: Partial<Omit<Purchase, 'id' | 'type' | 'paidById'>>
): Promise<void> {
  try {
    const purchaseRef = doc(firestore, `purchases/${purchaseId}`);
    await updateDoc(purchaseRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    // Check for Firebase permission denied error
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
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
    await deleteDoc(purchaseRef);
  } catch (error: any) {
    // Check for Firebase permission denied error
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      throw new Error('PERMISSION_DENIED: You can only modify your own expenses.');
    }
    // Re-throw other errors
    throw error;
  }
}
