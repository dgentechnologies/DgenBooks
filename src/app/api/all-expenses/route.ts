import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { Purchase, Settlement } from '@/lib/types';

// ---------------------------------------------------------------------------
// Firebase Admin initialization (shared across requests in the same process)
// ---------------------------------------------------------------------------

function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_BOOKS_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_BOOKS_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_BOOKS_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin env vars: FIREBASE_BOOKS_PROJECT_ID, ' +
        'FIREBASE_BOOKS_CLIENT_EMAIL, FIREBASE_BOOKS_PRIVATE_KEY'
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

function getDb(): FirebaseFirestore.Firestore {
  const app = getAdminApp();
  const databaseId = process.env.FIREBASE_BOOKS_DATABASE_ID;
  return databaseId && databaseId !== '(default)'
    ? getFirestore(app, databaseId)
    : getFirestore(app);
}

// ---------------------------------------------------------------------------
// GET /api/all-expenses
//
// Returns all purchases and settlements from all users.
// Requires a valid Firebase ID token in the Authorization header.
//
// Response:
//   { purchases: Purchase[], settlements: Settlement[] }
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    // ── 1. Verify the Firebase ID token ──────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    try {
      const app = getAdminApp();
      // Any authenticated team member may read all expenses — this is intentional
      // for a shared team expense tracker where full visibility is required.
      await getAuth(app).verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const db = getDb();

    // ── 2. Fetch all purchases via collection group query ─────────────────────
    // This fetches from all /users/{userId}/purchases subcollections.
    const purchaseGroupSnap = await db.collectionGroup('purchases').get();
    const purchasesMap = new Map<string, Purchase>();

    for (const doc of purchaseGroupSnap.docs) {
      const data = doc.data() as Omit<Purchase, 'id'>;
      purchasesMap.set(doc.id, { ...data, id: doc.id, type: 'purchase' });
    }

    // Also fetch from the legacy top-level /purchases collection.
    try {
      const legacyPurchasesSnap = await db.collection('purchases').get();
      for (const doc of legacyPurchasesSnap.docs) {
        if (!purchasesMap.has(doc.id)) {
          const data = doc.data() as Omit<Purchase, 'id'>;
          purchasesMap.set(doc.id, { ...data, id: doc.id, type: 'purchase' });
        }
      }
    } catch {
      // Legacy collection may not exist — degrade gracefully.
    }

    // ── 3. Fetch all settlements via collection group query ───────────────────
    const settlementGroupSnap = await db.collectionGroup('settlements').get();
    const settlementsMap = new Map<string, Settlement>();

    for (const doc of settlementGroupSnap.docs) {
      const data = doc.data() as Omit<Settlement, 'id'>;
      settlementsMap.set(doc.id, { ...data, id: doc.id, type: 'settlement' });
    }

    // Also fetch from the legacy top-level /settlements collection.
    try {
      const legacySettlementsSnap = await db.collection('settlements').get();
      for (const doc of legacySettlementsSnap.docs) {
        if (!settlementsMap.has(doc.id)) {
          const data = doc.data() as Omit<Settlement, 'id'>;
          settlementsMap.set(doc.id, { ...data, id: doc.id, type: 'settlement' });
        }
      }
    } catch {
      // Legacy collection may not exist — degrade gracefully.
    }

    return NextResponse.json({
      purchases: Array.from(purchasesMap.values()),
      settlements: Array.from(settlementsMap.values()),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses';
    console.error('[all-expenses] Unexpected error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
