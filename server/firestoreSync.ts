import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, Firestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

export interface DatabaseState {
  users?: any[];
  tasks?: any[];
  dossiers?: any[];
  projects?: any[];
  publicLands?: any[];
  violations?: any[];
  disputes?: any[];
  settings?: any;
  calendarEvents?: any[];
  registerBooks?: any[];
  documents?: any[];
  notifications?: any[];
  activityLogs?: any[];
  deletedDossiers?: any[];
  deletedTasks?: any[];
  deletedPublicLands?: any[];
  deletedViolations?: any[];
  deletedDisputes?: any[];
  deletedRegisterBooks?: any[];
}

let firestoreDb: Firestore | null = null;
let isInitialized = false;

export function initFirestore(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('[FIRESTORE_SYNC] firebase-applet-config.json not found.');
      return null;
    }
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    if (!config.projectId || !config.apiKey) {
      console.warn('[FIRESTORE_SYNC] Incomplete Firebase configuration.');
      return null;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    firestoreDb = getFirestore(app, config.firestoreDatabaseId || '(default)');
    isInitialized = true;
    console.log(`[FIRESTORE_SYNC] Connected to Cloud Firestore: ${config.projectId} (DB: ${config.firestoreDatabaseId || 'default'})`);
    return firestoreDb;
  } catch (err: any) {
    console.error('[FIRESTORE_SYNC_INIT_ERROR]', err?.message || err);
    return null;
  }
}

function cleanForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  return JSON.parse(JSON.stringify(data));
}

/**
 * Save current database state to Firestore Cloud Collections for permanent persistence
 */
export async function syncToFirestore(data: DatabaseState): Promise<void> {
  const db = initFirestore();
  if (!db) return;

  try {
    const nowIso = new Date().toISOString();

    const writePromises: Promise<any>[] = [
      setDoc(doc(db, 'system', 'meta'), {
        updatedAt: nowIso,
        dossiersCount: data.dossiers?.length || 0,
        projectsCount: data.projects?.length || 0,
        publicLandsCount: data.publicLands?.length || 0,
        violationsCount: data.violations?.length || 0,
        disputesCount: data.disputes?.length || 0,
        tasksCount: data.tasks?.length || 0,
      }),
      setDoc(doc(db, 'system', 'projects'), {
        items: cleanForFirestore(data.projects || []),
        updatedAt: nowIso,
      }),
      setDoc(doc(db, 'system', 'publicLands'), {
        items: cleanForFirestore(data.publicLands || []),
        deleted: cleanForFirestore(data.deletedPublicLands || []),
        updatedAt: nowIso,
      }),
      setDoc(doc(db, 'system', 'violations'), {
        items: cleanForFirestore(data.violations || []),
        deleted: cleanForFirestore(data.deletedViolations || []),
        updatedAt: nowIso,
      }),
      setDoc(doc(db, 'system', 'disputes'), {
        items: cleanForFirestore(data.disputes || []),
        deleted: cleanForFirestore(data.deletedDisputes || []),
        updatedAt: nowIso,
      }),
      setDoc(doc(db, 'system', 'dossiers'), {
        items: cleanForFirestore(data.dossiers || []),
        deleted: cleanForFirestore(data.deletedDossiers || []),
        updatedAt: nowIso,
      }),
      setDoc(doc(db, 'system', 'tasks'), {
        items: cleanForFirestore(data.tasks || []),
        deleted: cleanForFirestore(data.deletedTasks || []),
        updatedAt: nowIso,
      }),
      setDoc(doc(db, 'system', 'settings'), {
        settings: cleanForFirestore(data.settings || {}),
        updatedAt: nowIso,
      }),
      setDoc(doc(db, 'system', 'users'), {
        items: cleanForFirestore((data.users || []).map((u) => ({ ...u, password: u.password || 'ln123456' }))),
        updatedAt: nowIso,
      }),
    ];

    if (Array.isArray(data.documents)) {
      writePromises.push(setDoc(doc(db, 'system', 'documents'), { items: cleanForFirestore(data.documents), updatedAt: nowIso }));
    }
    if (Array.isArray(data.registerBooks)) {
      writePromises.push(
        setDoc(doc(db, 'system', 'registerBooks'), {
          items: cleanForFirestore(data.registerBooks),
          deleted: cleanForFirestore(data.deletedRegisterBooks || []),
          updatedAt: nowIso,
        })
      );
    }
    if (Array.isArray(data.calendarEvents)) {
      writePromises.push(setDoc(doc(db, 'system', 'calendarEvents'), { items: cleanForFirestore(data.calendarEvents), updatedAt: nowIso }));
    }

    await Promise.all(writePromises);
    console.log(`[FIRESTORE_SYNC_SUCCESS] Saved state to Google Cloud Firestore (Projects: ${data.projects?.length || 0}, Dossiers: ${data.dossiers?.length || 0}, 5% Land: ${data.publicLands?.length || 0}, Violations: ${data.violations?.length || 0}, Disputes: ${data.disputes?.length || 0})`);
  } catch (err: any) {
    console.error('[FIRESTORE_SYNC_ERROR]', err?.message || err);
  }
}

/**
 * Load database state from Firestore Cloud Collections
 */
export async function loadFromFirestore(): Promise<Partial<DatabaseState> | null> {
  const db = initFirestore();
  if (!db) return null;

  try {
    console.log('[FIRESTORE_LOAD] Fetching latest state from Google Cloud Firestore...');
    const [
      metaSnap,
      projectsSnap,
      pubLandSnap,
      violSnap,
      dispSnap,
      dosSnap,
      tasksSnap,
      usersSnap,
      settingsSnap,
      calendarSnap,
      booksSnap,
      docsSnap,
    ] = await Promise.all([
      getDoc(doc(db, 'system', 'meta')),
      getDoc(doc(db, 'system', 'projects')),
      getDoc(doc(db, 'system', 'publicLands')),
      getDoc(doc(db, 'system', 'violations')),
      getDoc(doc(db, 'system', 'disputes')),
      getDoc(doc(db, 'system', 'dossiers')),
      getDoc(doc(db, 'system', 'tasks')),
      getDoc(doc(db, 'system', 'users')),
      getDoc(doc(db, 'system', 'settings')),
      getDoc(doc(db, 'system', 'calendarEvents')),
      getDoc(doc(db, 'system', 'registerBooks')),
      getDoc(doc(db, 'system', 'documents')),
    ]);

    if (!metaSnap.exists()) {
      console.log('[FIRESTORE_LOAD] No cloud snapshot found yet in Firestore.');
      return null;
    }

    const result: Partial<DatabaseState> = {};

    if (projectsSnap.exists()) {
      result.projects = projectsSnap.data()?.items || [];
    }
    if (pubLandSnap.exists()) {
      result.publicLands = pubLandSnap.data()?.items || [];
      result.deletedPublicLands = pubLandSnap.data()?.deleted || [];
    }
    if (violSnap.exists()) {
      result.violations = violSnap.data()?.items || [];
      result.deletedViolations = violSnap.data()?.deleted || [];
    }
    if (dispSnap.exists()) {
      result.disputes = dispSnap.data()?.items || [];
      result.deletedDisputes = dispSnap.data()?.deleted || [];
    }
    if (dosSnap.exists()) {
      result.dossiers = dosSnap.data()?.items || [];
      result.deletedDossiers = dosSnap.data()?.deleted || [];
    }
    if (tasksSnap.exists()) {
      result.tasks = tasksSnap.data()?.items || [];
      result.deletedTasks = tasksSnap.data()?.deleted || [];
    }
    if (usersSnap.exists()) {
      result.users = usersSnap.data()?.items || [];
    }
    if (settingsSnap.exists()) {
      result.settings = settingsSnap.data()?.settings || {};
    }
    if (calendarSnap.exists()) {
      result.calendarEvents = calendarSnap.data()?.items || [];
    }
    if (booksSnap.exists()) {
      result.registerBooks = booksSnap.data()?.items || [];
      result.deletedRegisterBooks = booksSnap.data()?.deleted || [];
    }
    if (docsSnap.exists()) {
      result.documents = docsSnap.data()?.items || [];
    }

    console.log(`[FIRESTORE_LOAD_SUCCESS] Restored from Firestore: Projects=${result.projects?.length || 0}, Dossiers=${result.dossiers?.length || 0}, Tasks=${result.tasks?.length || 0}, 5% Land=${result.publicLands?.length || 0}, Violations=${result.violations?.length || 0}, Disputes=${result.disputes?.length || 0}, Calendar=${result.calendarEvents?.length || 0}, Books=${result.registerBooks?.length || 0}, Docs=${result.documents?.length || 0}`);
    return result;
  } catch (err: any) {
    console.error('[FIRESTORE_LOAD_ERROR]', err?.message || err);
    return null;
  }
}
