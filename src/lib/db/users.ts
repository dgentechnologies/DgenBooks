import { Firestore, doc, setDoc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import type { User } from '@/lib/types';

/**
 * Create or update a user profile in Firestore
 */
export async function createUserProfile(
  firestore: Firestore,
  userId: string,
  userData: Omit<User, 'id'>
): Promise<void> {
  const userRef = doc(firestore, 'users', userId);
  await setDoc(userRef, {
    id: userId,
    ...userData,
  });
}

/**
 * Get a user profile from Firestore
 */
export async function getUserProfile(
  firestore: Firestore,
  userId: string
): Promise<User | null> {
  const userRef = doc(firestore, 'users', userId);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return userSnap.data() as User;
  }
  
  return null;
}

/**
 * Get all users (for split selection)
 * Note: This is limited by Firestore rules that prevent listing all users
 * In production, consider using a different approach or caching
 */
export async function getAllUsers(
  firestore: Firestore
): Promise<User[]> {
  try {
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef);
    const querySnapshot = await getDocs(q);
    
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as User);
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}
