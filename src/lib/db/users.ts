import { Firestore, doc, setDoc, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { getNicknameFromFullName } from '@/lib/user-mapping';

/**
 * Create or update a user profile in Firestore
 */
export async function createUserProfile(
  firestore: Firestore,
  userId: string,
  userData: Omit<User, 'id'>
): Promise<void> {
  // Generate nickname from the full name if not provided
  const nickname = userData.nickname || getNicknameFromFullName(userData.name);
  
  const userRef = doc(firestore, 'users', userId);
  await setDoc(userRef, {
    id: userId,
    ...userData,
    nickname,
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
 * Get all active (non-legacy) users.
 *
 * After a Firebase project migration, orphaned old-project user profiles may
 * still exist in the database (they cannot be deleted because the original UID
 * no longer exists in Firebase Auth). A profile is considered orphaned when its
 * `id` appears as the `legacyUid` field of another profile — meaning the user
 * has already completed migration to a new UID. This function filters them out
 * so the UI only shows each person once.
 *
 * Note: Under the current user-ownership Firestore rules, listing the /users
 * collection is forbidden for privacy reasons. This function returns an empty
 * array; user enumeration must be handled via a server-side mechanism (e.g. a
 * Cloud Function or Admin SDK) if required.
 */
export async function getAllUsers(
  firestore: Firestore
): Promise<User[]> {
  // User listing is disallowed by Firestore security rules (allow list: if false).
  // Return an empty array so callers degrade gracefully without throwing.
  return [];
}
