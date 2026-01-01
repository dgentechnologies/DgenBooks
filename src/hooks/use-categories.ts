"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Category } from '@/lib/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    const categoriesRef = collection(firestore, `users/${user.uid}/categories`);
    
    const unsubscribe = onSnapshot(
      categoriesRef,
      (snapshot) => {
        const categoriesData: Category[] = [];
        snapshot.forEach((doc) => {
          categoriesData.push(doc.data() as Category);
        });
        
        // Sort categories alphabetically
        categoriesData.sort((a, b) => a.name.localeCompare(b.name));
        
        setCategories(categoriesData);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching categories:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]);

  return { categories, isLoading, error };
}
