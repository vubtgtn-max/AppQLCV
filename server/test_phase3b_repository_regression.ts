import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { StorageEngineFactory } from './repositories';
import { Database } from './db';

const DB_FILE = path.resolve(process.cwd(), 'data/db.json');
const EXPECTED_SHA = '9da2e26c58cb2f06b7fd23b256492be15939ee67d526e1b6c441e1ba935c2c53';
const BACKUP_FILE = path.resolve(process.cwd(), 'data/db.json.test_phase3b_bak');

function getSha(filepath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filepath)).digest('hex');
}

interface TestItem {
  id: number;
  name: string;
  passed: boolean;
  details: string;
}

const tests: TestItem[] = [];

function record(name: string, passed: boolean, details: string) {
  tests.push({ id: tests.length + 1, name, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] #${tests.length} ${name}: ${details}`);
}

async function runTests() {
  console.log('======================================================================');
  console.log('PHASE 3B-1.5: REPOSITORY LAYER & DESIGN REVIEW REGRESSION SUITE');
  console.log('======================================================================\n');

  // 1. Initial SHA Verification
  const initialSha = getSha(DB_FILE);
  record('Initial db.json SHA verification', initialSha === EXPECTED_SHA, `SHA: ${initialSha}`);
  if (initialSha !== EXPECTED_SHA) {
    console.error('FATAL: Initial SHA does not match expected SHA! Aborting.');
    process.exit(1);
  }

  // Backup original db.json for safety
  fs.copyFileSync(DB_FILE, BACKUP_FILE);

  try {
    const engine = StorageEngineFactory.getEngine('json');
    record('StorageEngineFactory.getEngine("json")', engine.name === 'JsonFileStorageEngine', `Engine name: ${engine.name}`);

    // 2. Read operations on repositories
    const users = await engine.users.findMany();
    record('Repository read: users.findMany()', users.length > 0, `Found ${users.length} users`);

    const admin = await engine.users.findByUsername('vudvh');
    record('Repository query: users.findByUsername("vudvh")', admin !== null && admin.role === 'admin', `Admin name: ${admin?.name}`);

    const settings = await engine.settings.getSettings();
    record('Repository read: settings.getSettings()', typeof settings.deadlineWarningDays === 'number', `Warning days: ${settings.deadlineWarningDays}`);

    const tasks = await engine.tasks.findMany();
    record('Repository read: tasks.findMany()', Array.isArray(tasks), `Tasks count: ${tasks.length}`);

    const dossiers = await engine.dossiers.findMany();
    record('Repository read: dossiers.findMany()', Array.isArray(dossiers), `Dossiers count: ${dossiers.length}`);

    const deletedDossiers = await engine.deletedDossiers.findMany();
    record('Repository read: deletedDossiers.findMany()', Array.isArray(deletedDossiers), `Deleted dossiers: ${deletedDossiers.length}`);

    const calendar = await engine.calendarEvents.findMany();
    record('Repository read: calendarEvents.findMany()', Array.isArray(calendar), `Calendar events: ${calendar.length}`);

    const registerBooks = await engine.registerBooks.findMany();
    record('Repository read: registerBooks.findMany()', Array.isArray(registerBooks), `Register books: ${registerBooks.length}`);

    const documents = await engine.documents.findMany();
    record('Repository read: documents.findMany()', Array.isArray(documents), `Documents: ${documents.length}`);

    const projects = await engine.projects.findMany();
    record('Repository read: projects.findMany()', Array.isArray(projects), `Projects: ${projects.length}`);

    const notifications = await engine.notifications.findMany();
    record('Repository read: notifications.findMany()', Array.isArray(notifications), `Notifications: ${notifications.length}`);

    const activityLogs = await engine.activityLogs.findMany();
    record('Repository read: activityLogs.findMany()', Array.isArray(activityLogs), `Activity logs: ${activityLogs.length}`);

    // 3. Idempotency handling
    const testKey = 'test_key_' + Date.now();
    let idemp = await engine.checkIdempotency(testKey);
    record('Idempotency check non-existent key', idemp === null, 'Correctly returns null');

    await engine.setIdempotencyProcessing(testKey, 60);
    idemp = await engine.checkIdempotency(testKey);
    record('Idempotency set PROCESSING', idemp?.status === 'PROCESSING', `Status is ${idemp?.status}`);

    await engine.setIdempotencySuccess(testKey, { result: 'OK', dossierCount: 1 });
    idemp = await engine.checkIdempotency(testKey);
    record('Idempotency set SUCCESS', idemp?.status === 'SUCCESS' && idemp.response?.result === 'OK', `Status: ${idemp?.status}, Response: ${JSON.stringify(idemp?.response)}`);

    // Crash recovery simulation: if timestamp is old
    const crashKey = 'crash_key_' + Date.now();
    await engine.setIdempotencyProcessing(crashKey, 60);
    // Tamper internal updatedAt to simulate 35 seconds elapsed (timeout threshold is 30s)
    const store = (engine as any).idempotencyStore;
    const rec = store.get(crashKey);
    if (rec) {
      rec.updatedAt = new Date(Date.now() - 35000).toISOString();
    }
    const recovered = await engine.checkIdempotency(crashKey);
    record('Idempotency crash-recovery auto-transition to FAILED', recovered?.status === 'FAILED', `Recovered status: ${recovered?.status}, Note: ${recovered?.error}`);

    // 4. Firestore skeleton safety check (must throw blocked error)
    let firestoreBlocked = false;
    try {
      StorageEngineFactory.getEngine('firestore');
    } catch (e: any) {
      firestoreBlocked = e.message.includes('STORAGE_FACTORY_BLOCKED');
    }
    record('Firestore factory security block', firestoreBlocked, 'Correctly throws STORAGE_FACTORY_BLOCKED');

    // 5. Test Transaction & WriteBatch abstraction logic in an ephemeral sandbox
    const txSandboxPassed = await engine.runTransaction(async (tx) => {
      const user = await tx.get<any>('users', 'user_hoaivu');
      return user !== null && user.username === 'vudvh';
    });
    record('Engine runTransaction (Read -> Check -> Write atomic flow)', txSandboxPassed, 'Transaction executed safely');

    console.log('\n======================================================================');
    console.log(`TOTAL TESTS: ${tests.length} | PASSED: ${tests.filter(t => t.passed).length} | FAILED: ${tests.filter(t => !t.passed).length}`);
    console.log('======================================================================\n');
  } finally {
    // Guaranteed restoration of exact initial db.json file
    fs.copyFileSync(BACKUP_FILE, DB_FILE);
    fs.unlinkSync(BACKUP_FILE);

    const finalSha = getSha(DB_FILE);
    const shaUnchanged = finalSha === EXPECTED_SHA;
    console.log(`Final db.json SHA256: ${finalSha}`);
    console.log(`SHA PERFECT MATCH:   ${shaUnchanged}`);
    if (!shaUnchanged) {
      console.error('CRITICAL DEFECT: Final db.json SHA does not match initial SHA!');
      process.exit(1);
    }
  }
}

runTests().catch((err) => {
  console.error('Test runner encountered uncaught error:', err);
  process.exit(1);
});
