'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Transaction, User } from '@/lib/types';

/**
 * Derive the set of unique user UIDs referenced in a list of transactions.
 * All fields that can carry a UID are checked: paidById, splitWith, paidByAmounts
 * keys, fromId and toId.
 */
function extractUids(transactions: Transaction[]): string[] {
  const uidSet = new Set<string>();
  for (const t of transactions) {
    if (t.type === 'purchase') {
      if (t.paidById) uidSet.add(t.paidById);
      if (t.splitWith) t.splitWith.forEach(uid => uidSet.add(uid));
      if (t.paidByAmounts) Object.keys(t.paidByAmounts).forEach(uid => uidSet.add(uid));
    } else if (t.type === 'settlement') {
      if (t.fromId) uidSet.add(t.fromId);
      if (t.toId) uidSet.add(t.toId);
    }
  }
  // Filter empty strings that might slip in from malformed documents.
  return Array.from(uidSet).filter(Boolean);
}

/**
 * Hook to fetch user profiles for every participant referenced in the supplied
 * transactions.
 *
 * Because the Firestore security rules forbid listing the top-level /users
 * collection, this hook fetches individual documents by UID instead.  Listing is
 * still disabled; only individual gets are used.
 *
 * @param transactions  Combined array of purchases and settlements already loaded
 *                      by useUserPurchases / useUserSettlements.
 * @param transactionsReady  Pass `true` once the transactions arrays are no longer
 *                           loading, so the hook knows when it is safe to derive
 *                           the UID list and begin fetching.
 */
export function useUsers(transactions: Transaction[] = [], transactionsReady = false) {
  const firestore = useFirestore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stable string key derived from the sorted UID list so the effect only fires
  // when the actual set of UIDs changes (not on every re-render).
  const uidsKey = useMemo(() => {
    if (!transactionsReady) return null;
    return extractUids(transactions).sort().join(',');
  }, [transactions, transactionsReady]);

  useEffect(() => {
    // Wait until the caller signals that transactions are fully loaded.
    if (!transactionsReady || uidsKey === null) {
      setIsLoading(true);
      return;
    }

    const uids = uidsKey.split(',').filter(Boolean);

    if (uids.length === 0) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    async function fetchUsers() {
      try {
        const snaps = await Promise.all(
          uids.map(uid => getDoc(doc(firestore, 'users', uid)))
        );
        if (mounted) {
          const fetchedUsers = snaps
            .filter(snap => snap.exists())
            .map(snap => snap.data() as User);
          setUsers(fetchedUsers);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch users'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      mounted = false;
    };
  }, [firestore, uidsKey, transactionsReady]);

  // Build a legacyUid → currentUid mapping so balance calculations can
  // attribute historical documents (which still carry old project UIDs) to the
  // correct current user.
  const uidMapping = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      if (u.legacyUid) {
        map.set(u.legacyUid, u.id);
      }
    }
    return map;
  }, [users]);

  return { users, isLoading, error, uidMapping };
}
