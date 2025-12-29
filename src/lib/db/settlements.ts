import { 
  Firestore, 
  collection, 
  addDoc, 
  doc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import type { Settlement } from '@/lib/types';

/**
 * Create a new settlement in Firestore under the user's settlements subcollection
 */
export async function createSettlement(
  firestore: Firestore,
  userId: string,
  settlementData: Omit<Settlement, 'id'>
): Promise<string> {
  const settlementsRef = collection(firestore, `users/${userId}/settlements`);
  
  const docRef = await addDoc(settlementsRef, {
    ...settlementData,
    createdAt: serverTimestamp(),
  });
  
  return docRef.id;
}

/**
 * Delete a settlement
 */
export async function deleteSettlement(
  firestore: Firestore,
  userId: string,
  settlementId: string
): Promise<void> {
  const settlementRef = doc(firestore, `users/${userId}/settlements/${settlementId}`);
  await deleteDoc(settlementRef);
}
