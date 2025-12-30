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
  
  return docRef.id;
}

/**
 * Delete a settlement
 * Only the user who paid can delete their settlement
 */
export async function deleteSettlement(
  firestore: Firestore,
  userId: string,
  settlementId: string
): Promise<void> {
  try {
    const settlementRef = doc(firestore, `settlements/${settlementId}`);
    await deleteDoc(settlementRef);
  } catch (error: any) {
    // Check for Firebase permission denied error
    if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
      throw new Error('PERMISSION_DENIED: You can only modify your own settlements.');
    }
    // Re-throw other errors
    throw error;
  }
}
