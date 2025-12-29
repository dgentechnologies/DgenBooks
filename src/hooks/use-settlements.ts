'use client';

import { useMemo } from 'react';
import { collection, query, CollectionReference, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Settlement } from '@/lib/types';

/**
 * Hook to fetch all settlements for the current user
 */
export function useUserSettlements() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const settlementsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const settlementsRef = collection(firestore, `users/${user.uid}/settlements`);
    return query(settlementsRef) as Query<DocumentData>;
  }, [firestore, user]);
  
  return useCollection<Settlement>(settlementsQuery);
}
