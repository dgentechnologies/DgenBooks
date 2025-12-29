'use client';

import { useMemo } from 'react';
import { collection, query, CollectionReference, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Purchase, Transaction } from '@/lib/types';

/**
 * Hook to fetch all purchases for the current user
 */
export function useUserPurchases() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const purchasesQuery = useMemoFirebase(() => {
    if (!user) return null;
    const purchasesRef = collection(firestore, `users/${user.uid}/purchases`);
    return query(purchasesRef) as Query<DocumentData>;
  }, [firestore, user]);
  
  const result = useCollection<Purchase>(purchasesQuery);
  
  return result;
}
