'use client';

import { useMemo } from 'react';
import { collection, query, CollectionReference, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Settlement } from '@/lib/types';

/**
 * Hook to fetch the current user's settlements from their private subcollection.
 * Under the user-ownership model, each user's settlements are stored at
 * /users/{userId}/settlements and are only accessible by that user.
 */
export function useUserSettlements() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const settlementsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const settlementsRef = collection(firestore, 'users', user.uid, 'settlements');
    return query(settlementsRef) as Query<DocumentData>;
  }, [firestore, user]);
  
  return useCollection<Settlement>(settlementsQuery);
}
