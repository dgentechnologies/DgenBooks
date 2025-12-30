'use client';

import { useMemo } from 'react';
import { collection, query, where, orderBy, Query, DocumentData } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { PurchaseRequest } from '@/lib/types';

/**
 * Hook to fetch all purchase requests from the shared purchaseRequests collection
 * All authenticated users can see all purchase requests for team collaboration
 */
export function usePurchaseRequests() {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const requestsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const requestsRef = collection(firestore, 'purchaseRequests');
    // Order by priority (Urgent first) and then by creation date
    return query(
      requestsRef,
      where('status', '==', 'Pending'),
      orderBy('createdAt', 'desc')
    ) as Query<DocumentData>;
  }, [firestore, user]);
  
  const result = useCollection<PurchaseRequest>(requestsQuery);
  
  // Sort to put Urgent items on top
  const sortedData = useMemo(() => {
    if (!result.data) return null;
    return [...result.data].sort((a, b) => {
      // Urgent items first
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [result.data]);
  
  return {
    ...result,
    data: sortedData,
  };
}
