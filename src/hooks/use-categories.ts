"use client";

import { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import type { Category } from '@/lib/types';
import { initializeDefaultCategories } from '@/lib/db/categories';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const initializingRef = useRef(false);
  
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
        
        // If no categories exist and we're not already initializing, initialize default categories
        if (categoriesData.length === 0 && !initializingRef.current) {
          initializingRef.current = true;
          initializeDefaultCategories(firestore, user.uid)
            .then(() => {
              // The snapshot listener will pick up the new categories automatically
              initializingRef.current = false;
            })
            .catch((err) => {
              console.error('Error initializing default categories:', err);
              setError(err as Error);
              setCategories([]);
              initializingRef.current = false;
            });
        } else if (categoriesData.length > 0) {
          // Sort categories alphabetically
          categoriesData.sort((a, b) => a.name.localeCompare(b.name));
          setCategories(categoriesData);
        }
        
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching categories:', err);
        setError(err as Error);
        setCategories([]);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]);

  return { categories, isLoading, error };
}
