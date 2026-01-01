import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import type { Category } from '../types';
import { DEFAULT_CATEGORIES } from '../default-categories';

const CATEGORIES_COLLECTION = 'categories';

// Initialize default categories for a user
export async function initializeDefaultCategories(firestore: Firestore, userId: string): Promise<void> {
  const categoriesRef = collection(firestore, `users/${userId}/${CATEGORIES_COLLECTION}`);
  
  for (const category of DEFAULT_CATEGORIES) {
    const categoryId = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await setDoc(doc(categoriesRef, categoryId), {
      ...category,
      id: categoryId,
      createdAt: new Date().toISOString(),
    });
  }
}

// Get all categories for a user
export async function getCategories(firestore: Firestore, userId: string): Promise<Category[]> {
  const categoriesRef = collection(firestore, `users/${userId}/${CATEGORIES_COLLECTION}`);
  const querySnapshot = await getDocs(categoriesRef);
  
  const categories: Category[] = [];
  querySnapshot.forEach((doc) => {
    categories.push(doc.data() as Category);
  });
  
  // If no categories exist, initialize defaults
  if (categories.length === 0) {
    await initializeDefaultCategories(firestore, userId);
    return getCategories(firestore, userId);
  }
  
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

// Create a new category
export async function createCategory(
  firestore: Firestore, 
  userId: string, 
  category: Omit<Category, 'id' | 'createdAt'>
): Promise<string> {
  const categoryId = category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const categoriesRef = collection(firestore, `users/${userId}/${CATEGORIES_COLLECTION}`);
  
  const newCategory: Category = {
    ...category,
    id: categoryId,
    createdAt: new Date().toISOString(),
  };
  
  await setDoc(doc(categoriesRef, categoryId), newCategory);
  return categoryId;
}

// Update a category
export async function updateCategory(
  firestore: Firestore,
  userId: string,
  categoryId: string,
  updates: Partial<Omit<Category, 'id' | 'createdAt'>>
): Promise<void> {
  const categoryRef = doc(firestore, `users/${userId}/${CATEGORIES_COLLECTION}/${categoryId}`);
  await updateDoc(categoryRef, updates);
}

// Delete a category
export async function deleteCategory(
  firestore: Firestore,
  userId: string,
  categoryId: string
): Promise<void> {
  const categoryRef = doc(firestore, `users/${userId}/${CATEGORIES_COLLECTION}/${categoryId}`);
  await deleteDoc(categoryRef);
}

// Check if a category is in use
export async function isCategoryInUse(
  firestore: Firestore,
  userId: string,
  categoryName: string
): Promise<boolean> {
  const purchasesRef = collection(firestore, `users/${userId}/purchases`);
  const q = query(purchasesRef, where('category', '==', categoryName));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

// Reassign purchases from one category to another
export async function reassignPurchaseCategory(
  firestore: Firestore,
  userId: string,
  oldCategory: string,
  newCategory: string
): Promise<void> {
  const purchasesRef = collection(firestore, `users/${userId}/purchases`);
  const q = query(purchasesRef, where('category', '==', oldCategory));
  const querySnapshot = await getDocs(q);
  
  const updates = querySnapshot.docs.map(doc => 
    updateDoc(doc.ref, { category: newCategory })
  );
  
  await Promise.all(updates);
}
