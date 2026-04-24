import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Old project config – reads from env vars, falls back to the known values
// for the legacy "dgenbooks" Firebase project whose client credentials are
// public (web API keys are intentionally not secret).
// ---------------------------------------------------------------------------

const OLD_PROJECT_ID = process.env.OLD_FIREBASE_PROJECT_ID ?? 'dgenbooks';
const OLD_API_KEY =
  process.env.OLD_FIREBASE_API_KEY ??
  'AIzaSyBrQ8CJrO0cRlmW_aI4qg1xxf0bg7AoIeQ';

const OLD_FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${OLD_PROJECT_ID}/databases/(default)/documents`;

// ---------------------------------------------------------------------------
// Firestore REST API helpers
// ---------------------------------------------------------------------------

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

function convertFirestoreValue(value: FirestoreValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values ?? []).map(convertFirestoreValue);
  }
  if ('mapValue' in value) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value.mapValue.fields ?? {})) {
      result[k] = convertFirestoreValue(v);
    }
    return result;
  }
  return null;
}

function convertDocument(doc: {
  name: string;
  fields?: Record<string, FirestoreValue>;
}): { id: string; data: Record<string, unknown> } {
  const parts = doc.name.split('/');
  const id = parts[parts.length - 1];
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc.fields ?? {})) {
    data[key] = convertFirestoreValue(value);
  }
  return { id, data };
}

/**
 * Fetch every document from a top-level collection in the old Firestore
 * project via the public REST API. Requires `allow read: if true` on the
 * old project (see firestore.old-project.rules).
 */
async function fetchOldCollection(
  collectionId: string
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const results: { id: string; data: Record<string, unknown> }[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${OLD_FIRESTORE_BASE}/${collectionId}`);
    url.searchParams.set('key', OLD_API_KEY);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString());

    if (response.status === 404) {
      // Collection does not exist in old project — skip silently.
      break;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Firestore REST API error for "${collectionId}": HTTP ${response.status} – ${text}`
      );
    }

    const json = (await response.json()) as {
      documents?: { name: string; fields?: Record<string, FirestoreValue> }[];
      nextPageToken?: string;
    };

    if (json.documents) {
      results.push(...json.documents.map(convertDocument));
    }

    pageToken = json.nextPageToken;
  } while (pageToken);

  return results;
}

// ---------------------------------------------------------------------------
// New project – Firebase Admin SDK (bypasses Firestore security rules)
// ---------------------------------------------------------------------------

function getAdminApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;

  const projectId = process.env.FIREBASE_BOOKS_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_BOOKS_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_BOOKS_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n'
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing required env vars: FIREBASE_BOOKS_PROJECT_ID, ' +
        'FIREBASE_BOOKS_CLIENT_EMAIL, FIREBASE_BOOKS_PRIVATE_KEY'
    );
  }

  return admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

function getNewDb(): FirebaseFirestore.Firestore {
  const app = getAdminApp();
  const databaseId = process.env.FIREBASE_BOOKS_DATABASE_ID;
  return databaseId && databaseId !== '(default)'
    ? getFirestore(app, databaseId)
    : getFirestore(app);
}

// ---------------------------------------------------------------------------
// Write documents to the new project in batches of 400 (well under the 500
// Firestore batch limit).
// ---------------------------------------------------------------------------

async function writeToNewDb(
  db: FirebaseFirestore.Firestore,
  collectionId: string,
  docs: { id: string; data: Record<string, unknown> }[],
  skipExisting: boolean
): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;
  const BATCH_SIZE = 400;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    let opsInBatch = 0;

    for (const { id, data } of chunk) {
      const ref = db.collection(collectionId).doc(id);

      if (skipExisting) {
        const snap = await ref.get();
        if (snap.exists) {
          skipped++;
          continue;
        }
      }

      batch.set(ref, data);
      written++;
      opsInBatch++;
    }

    if (opsInBatch > 0) {
      await batch.commit();
    }
  }

  return { written, skipped };
}

// ---------------------------------------------------------------------------
// POST /api/migrate-from-old-db
//
// Copies flat Firestore collections from the old "dgenbooks" project into the
// new project's matching flat collections. The existing /api/migrate-uid
// route then handles per-user UID remapping when each user first logs in.
//
// Request body (JSON, all fields optional):
//   dryRun       – boolean   (default: false) – count docs but do not write
//   skipExisting – boolean   (default: true)  – skip docs already in new DB
//   collections  – string[]  (default: all four)
//   secret       – string    – must match MIGRATION_SECRET env var when set
//
// Response:
//   { success, dryRun, skipExisting, oldProject, results }
//   results is a map of collectionId → { fetched, written, skipped, error? }
// ---------------------------------------------------------------------------

const COLLECTIONS_TO_MIGRATE = [
  'users',
  'purchases',
  'settlements',
  'purchaseRequests',
];

type CollResult = {
  fetched: number;
  written: number;
  skipped: number;
  error?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    // Optional secret guard
    const migrationSecret = process.env.MIGRATION_SECRET;
    if (migrationSecret && body.secret !== migrationSecret) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dryRun = body.dryRun === true;
    const skipExisting = body.skipExisting !== false; // default true
    const requestedCollections = Array.isArray(body.collections)
      ? (body.collections as string[]).filter((c) =>
          COLLECTIONS_TO_MIGRATE.includes(c)
        )
      : COLLECTIONS_TO_MIGRATE;

    const db = dryRun ? null : getNewDb();
    const results: Record<string, CollResult> = {};

    for (const collectionId of requestedCollections) {
      console.log(
        `[migrate-from-old-db] Fetching "${collectionId}" from old project "${OLD_PROJECT_ID}"…`
      );

      let docs: { id: string; data: Record<string, unknown> }[] = [];
      try {
        docs = await fetchOldCollection(collectionId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[migrate-from-old-db] Failed to fetch "${collectionId}": ${msg}`
        );
        results[collectionId] = {
          fetched: 0,
          written: 0,
          skipped: 0,
          error: msg,
        };
        continue;
      }

      console.log(
        `[migrate-from-old-db] "${collectionId}": ${docs.length} document(s) fetched`
      );

      if (dryRun || !db) {
        results[collectionId] = { fetched: docs.length, written: 0, skipped: 0 };
        continue;
      }

      try {
        const { written, skipped } = await writeToNewDb(
          db,
          collectionId,
          docs,
          skipExisting
        );
        results[collectionId] = { fetched: docs.length, written, skipped };
        console.log(
          `[migrate-from-old-db] "${collectionId}": written=${written}, skipped=${skipped}`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[migrate-from-old-db] Failed to write "${collectionId}": ${msg}`
        );
        results[collectionId] = {
          fetched: docs.length,
          written: 0,
          skipped: 0,
          error: msg,
        };
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      skipExisting,
      oldProject: OLD_PROJECT_ID,
      results,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Migration failed';
    console.error('[migrate-from-old-db] Unexpected error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
