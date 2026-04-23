'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, query, Query, DocumentData, getDocs, where } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Purchase } from '@/lib/types';

/**
 * Hook to fetch the current user's purchases.
 *
 * Reads from two locations and merges the results:
 *  1. /users/{userId}/purchases  — the current per-user subcollection (new data)
 *  2. /purchases                 — the legacy top-level collection created before the
 *                                  user-ownership migration; documents are filtered to
 *                                  only those where the current user is the payer or a
 *                                  participant.
 *
 * This ensures that data created both before and after the migration is visible.
 */
export function useUserPurchases() {
  const firestore = useFirestore();
  const { user } = useUser();

  // ── 1. Real-time listener on the per-user subcollection ──────────────────
  const purchasesQuery = useMemoFirebase(() => {
    if (!user) return null;
    const purchasesRef = collection(firestore, 'users', user.uid, 'purchases');
    return query(purchasesRef) as Query<DocumentData>;
  }, [firestore, user]);

  const { data: subcollectionData, isLoading: subcollectionLoading } =
    useCollection<Purchase>(purchasesQuery);

  // ── 2. One-time fetch from the legacy top-level /purchases collection ────
  const [legacyData, setLegacyData] = useState<Purchase[]>([]);
  const [legacyLoading, setLegacyLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLegacyData([]);
      setLegacyLoading(false);
      return;
    }

    let mounted = true;
    setLegacyLoading(true);

    async function fetchLegacy() {
      try {
        const purchasesRef = collection(firestore, 'purchases');

        const [byPayerSnap, bySplitSnap] = await Promise.all([
          getDocs(query(purchasesRef, where('paidById', '==', user!.uid))),
          getDocs(query(purchasesRef, where('splitWith', 'array-contains', user!.uid))),
        ]);

        const legacyMap = new Map<string, Purchase>();
        for (const d of [...byPayerSnap.docs, ...bySplitSnap.docs]) {
          if (!legacyMap.has(d.id)) {
            legacyMap.set(d.id, { ...(d.data() as Purchase), id: d.id });
          }
        }

        if (mounted) {
          setLegacyData(Array.from(legacyMap.values()));
          setLegacyLoading(false);
        }
      } catch {
        // Legacy collection may not exist or rules may deny access — degrade gracefully.
        if (mounted) {
          setLegacyData([]);
          setLegacyLoading(false);
        }
      }
    }

    fetchLegacy();

    return () => {
      mounted = false;
    };
  }, [firestore, user]);

  // ── 3. Merge both sources, de-duplicating by document ID ────────────────
  const data = useMemo(() => {
    const merged = new Map<string, Purchase>();

    // Legacy data added first; subcollection data takes precedence for the same ID.
    for (const p of legacyData) {
      merged.set(p.id, p);
    }
    for (const p of subcollectionData ?? []) {
      merged.set(p.id, p);
    }

    return Array.from(merged.values());
  }, [subcollectionData, legacyData]);

  return {
    data,
    isLoading: subcollectionLoading || legacyLoading,
    error: null,
  };
}
