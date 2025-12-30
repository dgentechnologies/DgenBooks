import { 
  Firestore, 
  collection, 
  addDoc, 
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import type { PurchaseRequest } from '@/lib/types';

/**
 * Create a new purchase request in the shared purchaseRequests collection
 */
export async function createPurchaseRequest(
  firestore: Firestore,
  userId: string,
  requestData: Omit<PurchaseRequest, 'id' | 'createdAt'>
): Promise<string> {
  const requestsRef = collection(firestore, 'purchaseRequests');
  
  const docRef = await addDoc(requestsRef, {
    ...requestData,
    createdAt: serverTimestamp(),
  });
  
  return docRef.id;
}

/**
 * Update an existing purchase request
 * Only the user who created the request can update it
 */
export async function updatePurchaseRequest(
  firestore: Firestore,
  userId: string,
  requestId: string,
  updates: Partial<Omit<PurchaseRequest, 'id' | 'requestedBy' | 'createdAt'>>
): Promise<void> {
  const requestRef = doc(firestore, `purchaseRequests/${requestId}`);
  await updateDoc(requestRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a purchase request
 * Only the user who created the request can delete it
 */
export async function deletePurchaseRequest(
  firestore: Firestore,
  userId: string,
  requestId: string
): Promise<void> {
  const requestRef = doc(firestore, `purchaseRequests/${requestId}`);
  await deleteDoc(requestRef);
}
