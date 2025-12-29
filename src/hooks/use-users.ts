'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { getAllUsers } from '@/lib/db';
import type { User } from '@/lib/types';

/**
 * Hook to fetch all users for the app
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
  
  return { users, isLoading, error };
}
