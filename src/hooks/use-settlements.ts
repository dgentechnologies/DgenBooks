'use client';

import { useMemo, useEffect, useState } from 'react';
import { collection, query, Query, DocumentData, getDocs, where } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Settlement } from '@/lib/types';

/**
 * Hook to fetch the current user's settlements.
 *
 * Reads from two locations and merges the results:
 *  1. /users/{userId}/settlements  — the current per-user subcollection (new data)
 *  2. /settlements                 — the legacy top-level collection created before the
 *                                    user-ownership migration; documents are filtered to
 *                                    only those where the current user is sender or receiver.
 *
 * This ensures that data created both before and after the migration is visible.
 */
export function useUserSettlements() {
  const firestore = useFirestore();
  const { user } = useUser();

  // ── 1. Real-time listener on the per-user subcollection ──────────────────
  const settlementsQuery = useMemoFirebase(() => {
    if (!user) return null;
    const settlementsRef = collection(firestore, 'users', user.uid, 'settlements');
    return query(settlementsRef) as Query<DocumentData>;
  }, [firestore, user]);

  const { data: subcollectionData, isLoading: subcollectionLoading } =
    useCollection<Settlement>(settlementsQuery);

  // ── 2. One-time fetch from the legacy top-level /settlements collection ──
  const [legacyData, setLegacyData] = useState<Settlement[]>([]);
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
        const settlementsRef = collection(firestore, 'settlements');

        const [byFromSnap, byToSnap] = await Promise.all([
          getDocs(query(settlementsRef, where('fromId', '==', user!.uid))),
          getDocs(query(settlementsRef, where('toId', '==', user!.uid))),
        ]);

        const legacyMap = new Map<string, Settlement>();
        for (const d of [...byFromSnap.docs, ...byToSnap.docs]) {
          if (!legacyMap.has(d.id)) {
            legacyMap.set(d.id, { ...(d.data() as Settlement), id: d.id });
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
    const merged = new Map<string, Settlement>();

    for (const s of legacyData) {
      merged.set(s.id, s);
    }
    for (const s of subcollectionData ?? []) {
      merged.set(s.id, s);
    }

    return Array.from(merged.values());
  }, [subcollectionData, legacyData]);

  return {
    data,
    isLoading: subcollectionLoading || legacyLoading,
    error: null,
  };
}
