'use client';

import { useMemo } from 'react';
import { collection, query, CollectionReference, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Settlement } from '@/lib/types';

/**
 * Hook to fetch all settlements from the shared settlements collection
 * All authenticated users can see all settlements for team balance tracking
 */
export function useUserSettlements() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const settlementsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const settlementsRef = collection(firestore, 'settlements');
    return query(settlementsRef) as Query<DocumentData>;
  }, [firestore, user]);
  
  return useCollection<Settlement>(settlementsQuery);
}
