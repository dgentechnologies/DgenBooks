'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFirestore } from '@/firebase';
import { getAllUsers } from '@/lib/db';
import type { User } from '@/lib/types';

/**
 * Hook to fetch all users for the app.
 * Also derives a UID mapping (legacyUid → currentUid) to resolve old project UIDs
 * that may still appear in migrated Firestore documents.
 * Note: This is limited by Firestore security rules
 */
export function useUsers() {
  const firestore = useFirestore();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    async function fetchUsers() {
      try {
        setIsLoading(true);
        const fetchedUsers = await getAllUsers(firestore);
        if (mounted) {
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
  }, [firestore]);

  // Build a mapping of legacyUid → currentUid so that balance calculations can
  // attribute historical Firestore documents (which still carry old project UIDs)
  // to the correct current user.
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
