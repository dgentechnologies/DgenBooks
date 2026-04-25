'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@/firebase';
import { getIdToken } from 'firebase/auth';
import type { Purchase, Settlement } from '@/lib/types';

interface AllExpensesResponse {
  purchases: Purchase[];
  settlements: Settlement[];
}

/**
 * Hook to fetch ALL purchases and settlements from all users.
 *
 * Uses the /api/all-expenses server route (backed by Firebase Admin SDK) to
 * bypass the per-user Firestore security rules and retrieve the complete
 * expense history for the whole team.
 */
export function useAllExpenses() {
  const auth = useAuth();
  const { user } = useUser();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setPurchases([]);
      setSettlements([]);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    async function fetchAll() {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('No authenticated user');
        }
        const idToken = await getIdToken(currentUser);
        const response = await fetch('/api/all-expenses', {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${response.status}`);
        }

        const data: AllExpensesResponse = await response.json();

        if (mounted) {
          setPurchases(
            (data.purchases ?? []).map(p => ({ ...p, type: 'purchase' as const }))
          );
          setSettlements(
            (data.settlements ?? []).map(s => ({ ...s, type: 'settlement' as const }))
          );
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch all expenses'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    fetchAll();

    return () => {
      mounted = false;
    };
  }, [auth, user]);

  return { purchases, settlements, isLoading, error };
}

