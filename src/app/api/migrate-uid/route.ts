import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Firebase Admin initialisation (shared across requests in the same process)
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
// Known full-name mapping (mirrors src/lib/user-mapping.ts)
// These are the 4 users whose data needs to be re-attributed after migration.
// ---------------------------------------------------------------------------

const KNOWN_FULL_NAMES: Record<string, string> = {
  tirtha: 'Tirthankar Dasgupta',
  suko: 'Sukomal Debnath',
  arpan: 'Arpan Bairagi',
  sagnik: 'Sagnik Mondal',
};

/** Resolve a raw display name to its canonical full name. */
function resolveFullName(displayName: string): string {
  const lower = displayName.toLowerCase().trim();
  if (KNOWN_FULL_NAMES[lower]) return KNOWN_FULL_NAMES[lower];
  const match = Object.values(KNOWN_FULL_NAMES).find(
    (n) => n.toLowerCase() === lower
  );
  return match ?? displayName;
}

// ---------------------------------------------------------------------------
// POST /api/migrate-uid
//
// Called right after a user's first login to the new Firebase project.
// Uses the Admin SDK (bypasses Firestore security rules) to:
//   1. Verify the caller's Firebase ID token.
//   2. Find the old user profile by matching the canonical full name.
//   3. Update every Firestore document that references the old UID.
//   4. Re-create the user profile under the new UID (preserving all fields).
//   5. Delete the old user profile.
//
// The endpoint is idempotent: if the new-UID profile already exists, it
// returns immediately without making any changes.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    // -----------------------------------------------------------------------
    // 1. Authenticate the caller
    // -----------------------------------------------------------------------
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);

    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth(getAdminApp()).verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const newUid = decodedToken.uid;
    const displayName: string = decodedToken.name ?? '';
    const fullName = resolveFullName(displayName);

    const db = getDb();

    // -----------------------------------------------------------------------
    // 2. Short-circuit if the new UID already has a profile (already migrated)
    // -----------------------------------------------------------------------
    const newProfileRef = db.collection('users').doc(newUid);
    const newProfileSnap = await newProfileRef.get();
    if (newProfileSnap.exists) {
      return NextResponse.json({ migrated: false, reason: 'Profile already exists for new UID' });
    }

    // -----------------------------------------------------------------------
    // 3. Find the old profile by matching the canonical full name OR the
    //    nickname. Profiles created before the nickname→full-name mapping was
    //    applied may be stored with the raw nickname (e.g. "tirtha") instead
    //    of the full name ("Tirthankar Dasgupta"). We accept both so that
    //    users who signed up pre-mapping are still correctly migrated.
    //    Skip post-migration profiles (they already carry a legacyUid field).
    //
    //    Two-pass strategy:
    //    Pass 1 – prefer a profile whose name IS the nickname (old-project
    //             profiles store the raw nickname as the name field). These
    //             are the profiles that hold the actual expense/settlement
    //             data and must be migrated first.
    //    Pass 2 – fall back to matching by canonical full name (covers the
    //             normal case where the full name was already stored).
    //
    //    This ordering ensures that if a previous failed-migration attempt
    //    created an orphaned profile with the full name but no expense data,
    //    the original old-project profile (with expense data) is always
    //    chosen over the orphaned one.
    // -----------------------------------------------------------------------
    const usersSnap = await db.collection('users').get();
    let oldUid: string | null = null;
    let oldProfileData: Record<string, unknown> = {};

    // Derive the nickname for the current user (if they are a known user).
    const nickname =
      Object.keys(KNOWN_FULL_NAMES).find(
        (k) => KNOWN_FULL_NAMES[k].toLowerCase() === fullName.toLowerCase()
      ) ?? '';

    // Pass 1: look for a profile stored with the raw nickname as its name.
    if (nickname) {
      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data();
        if (data.id === newUid) continue;
        if (data.legacyUid) continue;
        if (
          typeof data.name === 'string' &&
          data.name.toLowerCase() === nickname.toLowerCase()
        ) {
          oldUid = docSnap.id;
          oldProfileData = data;
          break;
        }
      }
    }

    // Pass 2: fall back to matching by canonical full name.
    if (!oldUid) {
      for (const docSnap of usersSnap.docs) {
        const data = docSnap.data();
        if (data.id === newUid) continue;
        if (data.legacyUid) continue;
        if (
          typeof data.name === 'string' &&
          data.name.toLowerCase() === fullName.toLowerCase()
        ) {
          oldUid = docSnap.id;
          oldProfileData = data;
          break;
        }
      }
    }

    if (!oldUid) {
      return NextResponse.json({ migrated: false, reason: 'No legacy profile found for name: ' + fullName });
    }

    // -----------------------------------------------------------------------
    // 4. Collect all Firestore documents that reference the old UID
    //    and compute the field updates needed for each document.
    // -----------------------------------------------------------------------
    type DocUpdate = { ref: FirebaseFirestore.DocumentReference; updates: Record<string, unknown> };
    // Use a Map keyed by "collection/docId" for O(1) de-duplication.
    const pendingUpdatesMap = new Map<string, DocUpdate>();

    function docKey(ref: FirebaseFirestore.DocumentReference): string {
      return `${ref.parent.id}/${ref.id}`;
    }

    // Helper: merge an update for a document, de-duplicating by composite key.
    function scheduleUpdate(
      ref: FirebaseFirestore.DocumentReference,
      updates: Record<string, unknown>
    ) {
      const key = docKey(ref);
      const existing = pendingUpdatesMap.get(key);
      if (existing) {
        Object.assign(existing.updates, updates);
      } else {
        pendingUpdatesMap.set(key, { ref, updates });
      }
    }

    // --- Purchases --------------------------------------------------------

    // a) Single-payer purchases where paidById == oldUid
    const byPaidBy = await db.collection('purchases').where('paidById', '==', oldUid).get();
    for (const docSnap of byPaidBy.docs) {
      const data = docSnap.data();
      const updates: Record<string, unknown> = { paidById: newUid };

      if (Array.isArray(data.splitWith) && data.splitWith.includes(oldUid)) {
        updates.splitWith = data.splitWith.map((id: string) => (id === oldUid ? newUid : id));
      }
      if (data.paymentType === 'multiple' && data.paidByAmounts && oldUid in data.paidByAmounts) {
        const newAmounts: Record<string, number> = {};
        for (const [k, v] of Object.entries<number>(data.paidByAmounts)) {
          newAmounts[k === oldUid ? newUid : k] = v;
        }
        updates.paidByAmounts = newAmounts;
      }

      scheduleUpdate(docSnap.ref, updates);
    }

    // b) Purchases where oldUid appears only in splitWith (not as payer)
    const bySplitWith = await db
      .collection('purchases')
      .where('splitWith', 'array-contains', oldUid)
      .get();
    for (const docSnap of bySplitWith.docs) {
      const data = docSnap.data();
      if (data.paidById === oldUid) continue; // already covered above

      const newSplitWith = (data.splitWith as string[]).map((id) => (id === oldUid ? newUid : id));
      scheduleUpdate(docSnap.ref, { splitWith: newSplitWith });
    }

    // c) Multi-payer purchases where oldUid is a key in paidByAmounts
    //    (covers cases where paidById is someone else but oldUid co-paid)
    const byMulti = await db
      .collection('purchases')
      .where('paymentType', '==', 'multiple')
      .get();
    for (const docSnap of byMulti.docs) {
      const data = docSnap.data();
      if (!data.paidByAmounts || !(oldUid in data.paidByAmounts)) continue;
      if (data.paidById === oldUid) continue; // already covered in (a)

      const newAmounts: Record<string, number> = {};
      for (const [k, v] of Object.entries<number>(data.paidByAmounts)) {
        newAmounts[k === oldUid ? newUid : k] = v;
      }
      const updates: Record<string, unknown> = { paidByAmounts: newAmounts };

      if (Array.isArray(data.splitWith) && data.splitWith.includes(oldUid)) {
        updates.splitWith = (data.splitWith as string[]).map((id) => (id === oldUid ? newUid : id));
      }

      scheduleUpdate(docSnap.ref, updates);
    }

    // --- Settlements -------------------------------------------------------

    // Process fromId and handle the edge case where both fromId AND toId == oldUid
    // in the same loop to avoid a second iteration over byFromId.
    const byFromId = await db.collection('settlements').where('fromId', '==', oldUid).get();
    for (const docSnap of byFromId.docs) {
      const data = docSnap.data();
      const updates: Record<string, unknown> = { fromId: newUid };
      if (data.toId === oldUid) updates.toId = newUid; // same user on both sides (edge case)
      scheduleUpdate(docSnap.ref, updates);
    }

    const byToId = await db.collection('settlements').where('toId', '==', oldUid).get();
    for (const docSnap of byToId.docs) {
      const data = docSnap.data();
      if (data.fromId === oldUid) continue; // already covered above
      scheduleUpdate(docSnap.ref, { toId: newUid });
    }

    // --- Purchase requests -------------------------------------------------

    const byRequestedBy = await db
      .collection('purchaseRequests')
      .where('requestedBy', '==', oldUid)
      .get();
    for (const docSnap of byRequestedBy.docs) {
      scheduleUpdate(docSnap.ref, { requestedBy: newUid });
    }

    // -----------------------------------------------------------------------
    // 5. Commit all updates in a single batch.
    //    Firestore WriteBatch supports up to 500 operations. Guard against
    //    exceeding that limit (each pendingUpdate = 1 op; categories add 2 per
    //    doc; plus 2 for the user profile set/delete).
    // -----------------------------------------------------------------------
    const pendingUpdates = Array.from(pendingUpdatesMap.values());

    const oldCategoriesSnap = await db
      .collection('users')
      .doc(oldUid)
      .collection('categories')
      .get();

    const totalOps =
      pendingUpdates.length +           // document field updates
      oldCategoriesSnap.size * 2 +      // category set + delete per doc
      2;                                // new user profile set + old profile delete

    if (totalOps > 500) {
      return NextResponse.json(
        { error: `Migration would require ${totalOps} batch operations, exceeding the Firestore limit of 500. Run migration in smaller batches.` },
        { status: 500 }
      );
    }

    const batch = db.batch();

    for (const { ref, updates } of pendingUpdates) {
      batch.update(ref, updates);
    }

    // --- Migrate user categories subcollection ----------------------------
    // Deleting a Firestore document does not remove its subcollections, so
    // we copy each category doc to the new UID and delete the old one.
    for (const catDoc of oldCategoriesSnap.docs) {
      batch.set(
        db.collection('users').doc(newUid).collection('categories').doc(catDoc.id),
        catDoc.data()
      );
      batch.delete(catDoc.ref);
    }

    // Re-create user profile under new UID, preserving all existing fields.
    // Always store the canonical full name so that profiles created with a
    // raw nickname (e.g. "tirtha") before the mapping was applied are
    // normalised on first post-migration login.
    const { id: _oldProfileId, ...rest } = oldProfileData;
    batch.set(newProfileRef, {
      ...rest,
      id: newUid,
      name: fullName,
      legacyUid: oldUid, // keeps a record of the old UID
    });

    // Delete the old profile
    batch.delete(db.collection('users').doc(oldUid));

    await batch.commit();

    console.log(
      `✅ [migrate-uid] Migrated ${oldUid} → ${newUid} (${fullName}), ` +
        `updated ${pendingUpdates.length} document(s)`
    );

    return NextResponse.json({
      migrated: true,
      oldUid,
      newUid,
      name: fullName,
      updatedDocs: pendingUpdates.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Migration failed';
    console.error('❌ [migrate-uid] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
