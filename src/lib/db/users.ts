import { Firestore, doc, setDoc, getDoc, collection, query, getDocs } from 'firebase/firestore';
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
 * Find a legacy user profile from a previous Firebase project migration.
 * Searches all user profiles for one that matches the given email or full name,
 * excluding the current UID and any profile that is itself already a post-migration
 * profile (i.e. has a legacyUid of its own).
 *
 * Email is checked first (more reliable); name matching is used as a fallback
 * for migrated profiles that were created before emails were stored.
 */
export async function findLegacyUserProfile(
  firestore: Firestore,
  currentUid: string,
  email: string | null,
  name: string
): Promise<User | null> {
  const usersRef = collection(firestore, 'users');
  const snapshot = await getDocs(usersRef);

  let byEmail: User | null = null;
  let byName: User | null = null;

  for (const docSnap of snapshot.docs) {
    const user = docSnap.data() as User;
    if (user.id === currentUid) continue; // skip own (new) profile if it somehow exists
    if (user.legacyUid) continue; // skip post-migration profiles — they already have a new UID

    if (email && user.email === email && !byEmail) {
      byEmail = user;
    }
    if (user.name.toLowerCase() === name.toLowerCase() && !byName) {
      byName = user;
    }
  }

  return byEmail ?? byName ?? null;
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
 * Note: This is limited by Firestore security rules
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

    // Build the set of UIDs that have been superseded by a post-migration profile.
    const supersededUids = new Set<string>(
      users.filter(u => u.legacyUid).map(u => u.legacyUid!)
    );

    // Return only profiles that are not orphaned legacy profiles.
    return users.filter(u => !supersededUids.has(u.id));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}
