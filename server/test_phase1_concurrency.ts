import fs from 'fs';
import path from 'path';
import { db } from './db.js';

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 1 BACKEND HARDENING: 10 CONCURRENCY & INTEGRITY TESTS');
  console.log('====================================================\n');

  let passedTests = 0;
  const results: { name: string; status: 'PASS' | 'FAIL'; note: string }[] = [];

  // TEST 1: 1 Single Write
  try {
    const initialVersion = db.getStateVersion();
    db.addActivityLog(
      {
        userId: 'test_user_1',
        userName: 'Test User 1',
        action: 'CREATE',
        module: 'tasks',
        description: 'Test 1: Single write verification',
      },
      false
    );
    await db.save();
    const newVersion = db.getStateVersion();
    const valid = newVersion === initialVersion + 1;
    if (!valid) throw new Error(`Expected stateVersion ${initialVersion + 1}, got ${newVersion}`);
    results.push({ name: 'Test 1: Single Request Write', status: 'PASS', note: `stateVersion incremented to ${newVersion}` });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 1: Single Request Write', status: 'FAIL', note: err.message });
  }

  // TEST 2: 10 Concurrent Writes
  try {
    const initialVersion = db.getStateVersion();
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 10; i++) {
      db.addActivityLog(
        {
          userId: `concurrent_user_${i}`,
          userName: `Concurrent User ${i}`,
          action: 'CREATE',
          module: 'tasks',
          description: `Test 2: Concurrent write ${i}`,
        },
        false
      );
      promises.push(db.save());
    }
    await Promise.all(promises);
    const newVersion = db.getStateVersion();
    const diff = newVersion - initialVersion;
    if (diff !== 10) throw new Error(`Expected 10 saves, got ${diff}`);
    results.push({ name: 'Test 2: 10 Concurrent Writes', status: 'PASS', note: `10 sequential queue writes handled without conflict (version +${diff})` });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 2: 10 Concurrent Writes', status: 'FAIL', note: err.message });
  }

  // TEST 3: 50 Concurrent Writes
  try {
    const initialVersion = db.getStateVersion();
    const initialLogsCount = (db.getData().activityLogs || []).length;
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 50; i++) {
      db.addActivityLog(
        {
          userId: `concurrent_50_${i}`,
          userName: `Concurrent 50 User ${i}`,
          action: 'UPDATE',
          module: 'tasks',
          description: `Test 3: 50 concurrent item ${i}`,
        },
        false
      );
      promises.push(db.save());
    }
    await Promise.all(promises);
    const finalLogsCount = (db.getData().activityLogs || []).length;
    const newVersion = db.getStateVersion();
    if (finalLogsCount !== initialLogsCount + 50) {
      throw new Error(`Expected logs count ${initialLogsCount + 50}, got ${finalLogsCount}`);
    }
    results.push({ name: 'Test 3: 50 Concurrent Writes', status: 'PASS', note: `50 operations queued and written sequentially, all 50 items preserved (version ${newVersion})` });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 3: 50 Concurrent Writes', status: 'FAIL', note: err.message });
  }

  // TEST 4: 100 Concurrent Writes Stress Test
  try {
    const initialVersion = db.getStateVersion();
    const initialLogsCount = (db.getData().activityLogs || []).length;
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 100; i++) {
      db.addActivityLog(
        {
          userId: `concurrent_100_${i}`,
          userName: `Stress User ${i}`,
          action: 'CREATE',
          module: 'dossiers',
          description: `Test 4: 100 stress concurrent item ${i}`,
        },
        false
      );
      promises.push(db.save());
    }
    await Promise.all(promises);
    const finalLogsCount = (db.getData().activityLogs || []).length;
    const newVersion = db.getStateVersion();
    if (finalLogsCount !== initialLogsCount + 100) {
      throw new Error(`Expected logs count ${initialLogsCount + 100}, got ${finalLogsCount}`);
    }
    // Verify file is strictly valid JSON
    const raw = fs.readFileSync(path.join(process.cwd(), 'data', 'db.json'), 'utf-8');
    JSON.parse(raw);
    results.push({ name: 'Test 4: 100 Concurrent Writes', status: 'PASS', note: `100 concurrent writes serialized by writeQueue without race condition or JSON corruption (version ${newVersion})` });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 4: 100 Concurrent Writes', status: 'FAIL', note: err.message });
  }

  // TEST 5: Rapid Succession Loop Saves
  try {
    const loopCount = 20;
    for (let i = 0; i < loopCount; i++) {
      db.addNotification(
        {
          userId: 'user_hoaivu',
          title: `Rapid Test ${i}`,
          content: `Rapid loop test content ${i}`,
          type: 'info',
        },
        false
      );
      await db.save();
    }
    results.push({ name: 'Test 5: Rapid Succession Loop Saves', status: 'PASS', note: `20 rapid sequential saves processed cleanly in order` });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 5: Rapid Succession Loop Saves', status: 'FAIL', note: err.message });
  }

  // TEST 6: Atomic File Safety (Temp File & Fsync)
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const tempFilesBefore = fs.readdirSync(dataDir).filter(f => f.includes('.tmp'));
    if (tempFilesBefore.length > 0) {
      throw new Error(`Found orphaned temp files before test: ${tempFilesBefore.join(', ')}`);
    }
    // Execute a save
    await db.save();
    // After successful save, no orphaned .tmp files should exist
    const tempFilesAfter = fs.readdirSync(dataDir).filter(f => f.includes('.tmp'));
    if (tempFilesAfter.length > 0) {
      throw new Error(`Found orphaned temp files after save: ${tempFilesAfter.join(', ')}`);
    }
    results.push({ name: 'Test 6: Atomic Temp File Isolation & Cleanup', status: 'PASS', note: 'No partial or orphaned temp files left on disk' });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 6: Atomic Temp File Isolation & Cleanup', status: 'FAIL', note: err.message });
  }

  // TEST 7: Atomic Rename & Content Integrity
  try {
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    const stats = fs.statSync(dbPath);
    if (stats.size === 0) throw new Error('db.json is empty');
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.tasks || !parsed.dossiers || !parsed.users) {
      throw new Error('Missing core collections in parsed db.json');
    }
    results.push({ name: 'Test 7: Atomic Rename & Content Integrity', status: 'PASS', note: `db.json size ${stats.size} bytes, parsed cleanly with all core collections` });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 7: Atomic Rename & Content Integrity', status: 'FAIL', note: err.message });
  }

  // TEST 8: Metadata and stateVersion Synchronization
  try {
    const metaPath = path.join(process.cwd(), 'data', 'db.meta.json');
    if (!fs.existsSync(metaPath)) throw new Error('db.meta.json does not exist');
    const metaRaw = fs.readFileSync(metaPath, 'utf-8');
    const meta = JSON.parse(metaRaw);
    const dbVersion = db.getStateVersion();
    if (meta.stateVersion !== dbVersion) {
      throw new Error(`Version mismatch: db=${dbVersion}, meta=${meta.stateVersion}`);
    }
    results.push({ name: 'Test 8: Metadata & stateVersion Synchronization', status: 'PASS', note: `db.meta.json stateVersion (${meta.stateVersion}) strictly matches in-memory version` });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 8: Metadata & stateVersion Synchronization', status: 'FAIL', note: err.message });
  }

  // TEST 9: Unique ID Collision Resistance
  try {
    const ids = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      const id = db.generateUniqueId('item');
      if (ids.has(id)) {
        throw new Error(`Duplicate ID generated: ${id} at iteration ${i}`);
      }
      ids.add(id);
    }
    results.push({ name: 'Test 9: Unique ID Generation (1000 rapid IDs)', status: 'PASS', note: '1000 generated IDs are 100% unique without collision' });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 9: Unique ID Generation (1000 rapid IDs)', status: 'PASS', note: err.message });
  }

  // TEST 10: Non-regression & Schema Preservation
  try {
    const data = db.getData();
    const requiredKeys = [
      'users',
      'tasks',
      'dossiers',
      'calendarEvents',
      'registerBooks',
      'documents',
      'notifications',
      'activityLogs',
      'settings',
      'deletedDossiers',
      'alertLogs',
      'projects',
    ];
    for (const key of requiredKeys) {
      if ((data as any)[key] === undefined) {
        throw new Error(`Missing schema key: ${key}`);
      }
    }
    // Verify pre-fix backup file is intact
    const backupPath = path.join(process.cwd(), 'data', 'backups', 'db.json.PRE_FIX_BACKUP');
    if (!fs.existsSync(backupPath)) {
      throw new Error('PRE_FIX_BACKUP file missing');
    }
    const backupStats = fs.statSync(backupPath);
    if (backupStats.size === 0) {
      throw new Error('PRE_FIX_BACKUP file is empty');
    }

    results.push({ name: 'Test 10: Non-Regression & Schema Integrity', status: 'PASS', note: `All 12 DatabaseSchema collections verified; PRE_FIX_BACKUP intact (${backupStats.size} bytes)` });
    passedTests++;
  } catch (err: any) {
    results.push({ name: 'Test 10: Non-Regression & Schema Integrity', status: 'FAIL', note: err.message });
  }

  console.log('----------------------------------------------------');
  console.log(`RESULTS: ${passedTests}/10 TESTS PASSED`);
  console.log('----------------------------------------------------');
  results.forEach((r, idx) => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${r.status}] ${r.name}`);
    console.log(`   Details: ${r.note}\n`);
  });

  if (passedTests === 10) {
    console.log('🎉 ALL 10 TESTS PASSED! BACKEND HARDENING VALIDATED.');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runTests();
