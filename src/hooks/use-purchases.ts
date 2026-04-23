'use client';

import { useMemo } from 'react';
import { collection, query, CollectionReference, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Purchase, Transaction } from '@/lib/types';

/**
 * Hook to fetch the current user's purchases from their private subcollection.
 * Under the user-ownership model, each user's purchases are stored at
 * /users/{userId}/purchases and are only accessible by that user.
 */
export function useUserPurchases() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const purchasesQuery = useMemoFirebase(() => {
    if (!user) return null;
    const purchasesRef = collection(firestore, 'users', user.uid, 'purchases');
    return query(purchasesRef) as Query<DocumentData>;
  }, [firestore, user]);
  
  const result = useCollection<Purchase>(purchasesQuery);
  
  return result;
}
