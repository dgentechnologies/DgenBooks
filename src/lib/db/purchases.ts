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
 * Create a new purchase in Firestore under the user's purchases subcollection
 */
export async function createPurchase(
  firestore: Firestore,
  userId: string,
  purchaseData: Omit<Purchase, 'id'>
): Promise<string> {
  const purchasesRef = collection(firestore, `users/${userId}/purchases`);
  
  const docRef = await addDoc(purchasesRef, {
    ...purchaseData,
    createdAt: serverTimestamp(),
  });
  
  return docRef.id;
}

/**
 * Update an existing purchase
 */
export async function updatePurchase(
  firestore: Firestore,
  userId: string,
  purchaseId: string,
  updates: Partial<Omit<Purchase, 'id' | 'type' | 'paidById'>>
): Promise<void> {
  const purchaseRef = doc(firestore, `users/${userId}/purchases/${purchaseId}`);
  await updateDoc(purchaseRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a purchase
 */
export async function deletePurchase(
  firestore: Firestore,
  userId: string,
  purchaseId: string
): Promise<void> {
  const purchaseRef = doc(firestore, `users/${userId}/purchases/${purchaseId}`);
  await deleteDoc(purchaseRef);
}
