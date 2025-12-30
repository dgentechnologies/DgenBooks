'use client';

import { useMemo } from 'react';
import { collection, query, where, Query, DocumentData } from 'firebase/firestore';
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
    // Only fetch pending requests
    return query(
      requestsRef,
      where('status', '==', 'Pending')
    ) as Query<DocumentData>;
  }, [firestore, user]);
  
  const result = useCollection<PurchaseRequest>(requestsQuery);
  
  // Sort to put Urgent items on top, then by createdAt
  const sortedData = useMemo(() => {
    if (!result.data) return null;
    return [...result.data].sort((a, b) => {
      // Urgent items first
      if (a.priority === 'Urgent' && b.priority !== 'Urgent') return -1;
      if (a.priority !== 'Urgent' && b.priority === 'Urgent') return 1;
      // Then by creation date if available (newer first)
      // createdAt might be a Firestore Timestamp or string
      if (a.createdAt && b.createdAt) {
        const aTime = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
        const bTime = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      }
      return 0;
    });
  }, [result.data]);
  
  return {
    ...result,
    data: sortedData,
  };
}
