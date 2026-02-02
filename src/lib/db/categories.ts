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

// Helper function to generate consistent category IDs
function generateCategoryId(categoryName: string): string {
  return categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// Ensure all default categories exist for a user (adds missing ones)
export async function ensureDefaultCategories(firestore: Firestore, userId: string): Promise<void> {
  console.log(`[ensureDefaultCategories] Starting check for user ${userId}`);
  const categoriesRef = collection(firestore, `users/${userId}/${CATEGORIES_COLLECTION}`);
  
  // Get existing categories
  const querySnapshot = await getDocs(categoriesRef);
  const existingCategories = new Set<string>();
  querySnapshot.forEach((doc) => {
    const category = doc.data() as Category;
    existingCategories.add(category.name);
  });
  
  console.log(`[ensureDefaultCategories] User ${userId} has ${existingCategories.size} categories:`, Array.from(existingCategories));
  
  // Add any missing default categories
  let addedCount = 0;
  for (const category of DEFAULT_CATEGORIES) {
    if (!existingCategories.has(category.name)) {
      console.log(`[ensureDefaultCategories] Adding missing category: ${category.name} for user ${userId}`);
      const categoryId = generateCategoryId(category.name);
      try {
        await setDoc(doc(categoriesRef, categoryId), {
          ...category,
          id: categoryId,
          createdAt: new Date().toISOString(),
        });
        addedCount++;
        console.log(`[ensureDefaultCategories] ✅ Successfully added category: ${category.name}`);
      } catch (error) {
        console.error(`[ensureDefaultCategories] ❌ Failed to add category ${category.name}:`, error);
        throw error;
      }
    }
  }
  
  console.log(`[ensureDefaultCategories] Complete for user ${userId}. Added ${addedCount} missing categories.`);
}

// Initialize default categories for a user
export async function initializeDefaultCategories(firestore: Firestore, userId: string): Promise<void> {
  const categoriesRef = collection(firestore, `users/${userId}/${CATEGORIES_COLLECTION}`);
  
  for (const category of DEFAULT_CATEGORIES) {
    const categoryId = generateCategoryId(category.name);
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
  
  // If no categories exist, initialize defaults and return them directly
  if (categories.length === 0) {
    const defaultCategories: Category[] = [];
    for (const category of DEFAULT_CATEGORIES) {
      const categoryId = generateCategoryId(category.name);
      const newCategory: Category = {
        ...category,
        id: categoryId,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(categoriesRef, categoryId), newCategory);
      defaultCategories.push(newCategory);
    }
    return defaultCategories.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

// Create a new category
export async function createCategory(
  firestore: Firestore, 
  userId: string, 
  category: Omit<Category, 'id' | 'createdAt'>
): Promise<string> {
  const categoriesRef = collection(firestore, `users/${userId}/${CATEGORIES_COLLECTION}`);
  let categoryId = generateCategoryId(category.name);
  
  // Check if ID already exists, append timestamp if needed
  const existingDoc = await getDoc(doc(categoriesRef, categoryId));
  if (existingDoc.exists()) {
    categoryId = `${categoryId}-${Date.now()}`;
  }
  
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
