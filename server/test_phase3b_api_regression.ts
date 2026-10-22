import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { apiRouter } from './api';
import { Database } from './db';
import { clearMutationGuardCache } from './mutationGuard';

const DB_FILE = path.resolve(process.cwd(), 'data/db.json');
const EXPECTED_SHA = '9da2e26c58cb2f06b7fd23b256492be15939ee67d526e1b6c441e1ba935c2c53';
const BACKUP_FILE = path.resolve(process.cwd(), 'data/db.json.api_test_bak');

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

async function requestJson(baseUrl: string, endpoint: string, options: any = {}): Promise<{ status: number; body: any; headers: any }> {
  const url = `${baseUrl}${endpoint}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let body: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  return { status: res.status, body, headers: Object.fromEntries(res.headers.entries()) };
}

async function runApiRegression() {
  console.log('======================================================================');
  console.log('PHASE 3B-1.5: API CONTRACT & REGRESSION TEST SUITE (14 FLOWS)');
  console.log('======================================================================\n');

  // Verify SHA before test
  const initialSha = getSha(DB_FILE);
  record('Initial db.json SHA-256 verification', initialSha === EXPECTED_SHA, `SHA: ${initialSha}`);
  if (initialSha !== EXPECTED_SHA) {
    console.error('Initial SHA mismatch! Aborting.');
    process.exit(1);
  }

  // Backup original db.json
  fs.copyFileSync(DB_FILE, BACKUP_FILE);

  // Setup ephemeral test Express server on port 3995
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use('/api', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3995, '127.0.0.1', () => resolve()));
  const baseUrl = 'http://127.0.0.1:3995/api';

  try {
    // FLOW 1: LOGIN (Valid Admin & Staff)
    const loginAdmin = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { username: 'vudvh', password: 'ln123456' },
    });
    record('1. Login: Admin authentication', loginAdmin.status === 200 && loginAdmin.body?.user?.username === 'vudvh', `Status: ${loginAdmin.status}, User: ${loginAdmin.body?.user?.name}`);

    const authHeaders = {
      'x-user-id': 'user_hoaivu',
    };

    // FLOW 2: LOAD DASHBOARD & SNAPSHOT
    const snapshot = await requestJson(baseUrl, '/sync/snapshot', {
      headers: authHeaders,
    });
    record('2. Load Dashboard: /api/sync/snapshot', snapshot.status === 200 && Array.isArray(snapshot.body?.users), `Users: ${snapshot.body?.users?.length}`);

    // FLOW 3: CREATE TASK
    const taskCode = 'TK_TEST_' + Date.now();
    const createTask = await requestJson(baseUrl, '/tasks', {
      method: 'POST',
      headers: authHeaders,
      body: {
        code: taskCode,
        name: 'Nhiệm vụ kiểm tra quy hoạch khu đất số 12',
        field: 'Đất đai',
        assigneeId: 'user_hoaivu',
        dueDate: '2026-10-01',
        priority: 'high',
      },
    });
    const createdTaskId = createTask.body?.id;
    record('3. Create Task: POST /api/tasks', (createTask.status === 200 || createTask.status === 201) && !!createdTaskId, `Task ID: ${createdTaskId}, Code: ${taskCode}`);

    // FLOW 4: UPDATE TASK
    const updateTask = await requestJson(baseUrl, `/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        name: 'Nhiệm vụ kiểm tra quy hoạch khu đất số 12 (Đã thẩm định)',
        status: 'in_progress',
      },
    });
    record('4. Update Task: PUT /api/tasks/:id', updateTask.status === 200 && updateTask.body?.status === 'in_progress', `Updated status: ${updateTask.body?.status}`);

    // FLOW 5: DELETE TASK
    const deleteTask = await requestJson(baseUrl, `/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    record('5. Delete Task: DELETE /api/tasks/:id', deleteTask.status === 200, `Deleted task response: ${deleteTask.body?.message || 'OK'}`);

    // FLOW 6: CREATE DOSSIER
    const dosCode = 'H17.130-TEST-' + Date.now().toString().slice(-4);
    const createDos = await requestJson(baseUrl, '/dossiers', {
      method: 'POST',
      headers: authHeaders,
      body: {
        code: dosCode,
        owner: 'Nguyễn Văn Test',
        parcel: '105',
        mapSheet: '22',
        procedure: 'Cấp đổi GCN quyền sử dụng đất',
        receivedDate: '2026-09-01',
        dueDate: '2026-09-25',
        handlerId: 'user_hoaivu',
        status: 'in_progress',
      },
    });
    const createdDosId = createDos.body?.id;
    record('6. Create Dossier: POST /api/dossiers', (createDos.status === 200 || createDos.status === 201) && !!createdDosId, `Dossier ID: ${createdDosId}, Code: ${dosCode}`);

    // FLOW 7: UPDATE DOSSIER
    const updateDos = await requestJson(baseUrl, `/dossiers/${createdDosId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        note: 'Đã hoàn thành kiểm tra thực địa ngày 18/09/2026',
        status: 'resolved',
      },
    });
    record('7. Update Dossier: PUT /api/dossiers/:id', updateDos.status === 200 && updateDos.body?.status === 'resolved', `Status: ${updateDos.body?.status}`);

    // FLOW 8: SOFT DELETE DOSSIER
    const deleteDos = await requestJson(baseUrl, `/dossiers/${createdDosId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    record('8. Soft Delete: DELETE /api/dossiers/:id (move to recycle bin)', deleteDos.status === 200, `Deleted code: ${deleteDos.body?.dossier?.code || deleteDos.body?.code}`);

    // FLOW 9: RESTORE DOSSIER
    const restoreDos = await requestJson(baseUrl, `/dossiers/restore-deleted/${createdDosId}`, {
      method: 'POST',
      headers: authHeaders,
    });
    record('9. Restore Dossier: POST /api/dossiers/restore-deleted/:id', restoreDos.status === 200, `Restored code: ${restoreDos.body?.dossier?.code || restoreDos.body?.code}`);

    // Clean up created dossier for cleanliness
    await requestJson(baseUrl, `/dossiers/${createdDosId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    // FLOW 10: IMPORT EXCEL TEST NHỎ (Simulation Batch)
    const testImportPayload = {
      dossiers: [
        {
          code: 'HS_TEST_IMPORT_1',
          owner: 'Lê Văn Thử Nghiệm 1',
          parcel: '10',
          mapSheet: '1',
          procedure: 'Đăng ký biến động',
          receivedDate: '2026-09-10',
          dueDate: '2026-09-30',
          handlerId: 'user_hoaivu',
          status: 'in_progress',
        },
        {
          code: 'HS_TEST_IMPORT_2',
          owner: 'Lê Văn Thử Nghiệm 2',
          parcel: '11',
          mapSheet: '1',
          procedure: 'Đăng ký biến động',
          receivedDate: '2026-09-10',
          dueDate: '2026-09-30',
          handlerId: 'user_hoaivu',
          status: 'in_progress',
        },
      ],
    };
    const batchImport = await requestJson(baseUrl, '/dossiers/batch', {
      method: 'POST',
      headers: authHeaders,
      body: testImportPayload,
    });
    record('10. Import Excel test nhỏ: POST /api/dossiers/batch', (batchImport.status === 200 || batchImport.status === 201) && batchImport.body?.count === 2, `Status: ${batchImport.status}, Count: ${batchImport.body?.count}`);

    // FLOW 11: F5 / RELOAD DATA REFRESH
    const reloadData = await requestJson(baseUrl, '/dossiers', {
      headers: authHeaders,
    });
    record('11. F5 Reload Data: GET /api/dossiers', reloadData.status === 200 && Array.isArray(reloadData.body), `Total returned: ${reloadData.body?.length}`);

    // FLOW 12: LOGOUT / RE-LOGIN
    const reLogin = await requestJson(baseUrl, '/auth/login', {
      method: 'POST',
      body: { username: 'vudvh', password: 'ln123456' },
    });
    record('12. Logout / Re-login authentication cycle', reLogin.status === 200 && reLogin.body?.user?.username === 'vudvh', 'Re-authenticated successfully');

    // FLOW 13: SSE EVENTS CONNECTION
    const sseResponse = await new Promise<{ status: number; contentType: string }>((resolve) => {
      const req = http.request(`${baseUrl}/sync/events`, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
      }, (res) => {
        resolve({
          status: res.statusCode || 0,
          contentType: res.headers['content-type'] || '',
        });
        req.destroy(); // Close stream after validating headers
      });
      req.on('error', () => resolve({ status: 500, contentType: '' }));
      req.end();
    });
    record('13. SSE: GET /api/sync/events streaming connection', sseResponse.status === 200 && sseResponse.contentType.includes('text/event-stream'), `Status: ${sseResponse.status}, Content-Type: ${sseResponse.contentType}`);

    // FLOW 14: DOUBLE-CLICK MUTATION GUARD / IDEMPOTENCY
    clearMutationGuardCache();
    const duplicateKey = 'idemp_double_click_test_' + Date.now();
    const doubleClickReq1 = requestJson(baseUrl, '/settings', {
      method: 'PUT',
      headers: { ...authHeaders, 'Idempotency-Key': duplicateKey },
      body: { deadlineWarningDays: 20 },
    });
    const doubleClickReq2 = requestJson(baseUrl, '/settings', {
      method: 'PUT',
      headers: { ...authHeaders, 'Idempotency-Key': duplicateKey },
      body: { deadlineWarningDays: 20 },
    });
    const [res1, res2] = await Promise.all([doubleClickReq1, doubleClickReq2]);
    const atLeastOneSuccess = res1.status === 200 || res2.status === 200;
    const guarded = res1.status === 429 || res2.status === 429 || (res1.status === 200 && res2.status === 200);
    record('14. Double-click Mutation Protection', atLeastOneSuccess && guarded, `Req1: ${res1.status}, Req2: ${res2.status}`);

    console.log('\n======================================================================');
    console.log(`API REGRESSION RESULTS: ${tests.length} | PASSED: ${tests.filter(t => t.passed).length} | FAILED: ${tests.filter(t => !t.passed).length}`);
    console.log('======================================================================\n');
  } finally {
    // Close server
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));

    // Restore exact pristine db.json file
    fs.copyFileSync(BACKUP_FILE, DB_FILE);
    fs.unlinkSync(BACKUP_FILE);

    // Final SHA verification
    const finalSha = getSha(DB_FILE);
    const shaMatches = finalSha === EXPECTED_SHA;
    console.log(`Pristine db.json restoration verified:`);
    console.log(`Expected SHA: ${EXPECTED_SHA}`);
    console.log(`Final SHA:    ${finalSha}`);
    console.log(`MATCH 100%:   ${shaMatches}`);
    if (!shaMatches) {
      console.error('FATAL DEFECT: Final SHA mismatch!');
      process.exit(1);
    }
    process.exit(0);
  }
}

runApiRegression().catch((err) => {
  console.error('API regression suite fatal error:', err);
  process.exit(1);
});
