/**
 * SCRIPT GIẢ LẬP VẬN HÀNH TOÀN DIỆN HỆ THỐNG
 * Kiểm tra: Server Web, REST APIs, Quy trình CRUD, Đồng bộ Realtime, Tính toàn vẹn Dữ liệu
 */

const BASE_URL = 'http://localhost:3000';

interface TestStepResult {
  step: string;
  module: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  latencyMs?: number;
}

const results: TestStepResult[] = [];

async function logStep(module: string, step: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const details = await fn();
    const latency = Date.now() - start;
    results.push({
      module,
      step,
      status: 'PASS',
      details: (details as string) || 'Hoạt động bình thường',
      latencyMs: latency,
    });
    console.log(`✅ [${module}] ${step}: OK (${latency}ms)`);
  } catch (err: any) {
    const latency = Date.now() - start;
    results.push({
      module,
      step,
      status: 'FAIL',
      details: err.message || String(err),
      latencyMs: latency,
    });
    console.error(`❌ [${module}] ${step}: THẤT BẠI - ${err.message}`);
  }
}

async function runSimulation() {
  console.log('===============================================================');
  console.log('🚀 BẮT ĐẦU CHẠY GIẢ LẬP KIỂM THỬ VẬN HÀNH TOÀN DIỆN HỆ THỐNG');
  console.log(`⏱️ Thời gian bắt đầu: ${new Date().toLocaleString('vi-VN')}`);
  console.log(`🌐 Máy chủ kiểm tra: ${BASE_URL}`);
  console.log('===============================================================\n');

  // 1. Kiểm tra Web Frontend HTML Entry
  await logStep('GIAO DIỆN WEB', 'Kiểm tra nạp trang chủ (index.html)', async () => {
    const res = await fetch(BASE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const html = await res.text();
    if (!html.includes('<div id="root">')) throw new Error('Không tìm thấy #root trong HTML');
    return `HTTP 200 OK, HTML hợp lệ (${html.length} bytes)`;
  });

  // 2. Kiểm tra Snapshot đồng bộ Realtime
  let snapshotData: any = null;
  await logStep('ĐỒNG BỘ DỮ LIỆU', 'Kiểm tra Endpoint /api/sync/snapshot', async () => {
    const res = await fetch(`${BASE_URL}/api/sync/snapshot`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    snapshotData = await res.json();
    return `Hồ sơ: ${snapshotData.dossiers?.length}, Nhiệm vụ: ${snapshotData.tasks?.length}, Dự án: ${snapshotData.projects?.length}, Đất 5%: ${snapshotData.publicLands?.length}, Tranh chấp: ${snapshotData.disputes?.length}, Vi phạm: ${snapshotData.violations?.length}`;
  });

  // 3. Kiểm tra các Endpoint đọc danh mục
  const endpoints = [
    { name: 'Hồ sơ Đất đai', path: '/api/dossiers', key: 'dossiers' },
    { name: 'Nhiệm vụ', path: '/api/tasks', key: 'tasks' },
    { name: 'Dự án GPMB', path: '/api/projects', key: 'projects' },
    { name: 'Đất 5% Công ích', path: '/api/public-lands', key: 'publicLands' },
    { name: 'Hòa giải Tranh chấp', path: '/api/disputes', key: 'disputes' },
    { name: 'Trật tự xây dựng & Vi phạm', path: '/api/violations', key: 'violations' },
    { name: 'Danh sách Cán bộ', path: '/api/users', key: 'users' },
    { name: 'Cấu hình Hệ thống', path: '/api/settings', key: 'settings' },
  ];

  for (const ep of endpoints) {
    await logStep('REST API READ', `Đọc dữ liệu [${ep.name}] (${ep.path})`, async () => {
      const res = await fetch(`${BASE_URL}${ep.path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const count = Array.isArray(data) ? data.length : 1;
      return `Phản hồi 200 OK, nạp thành công ${count} bản ghi`;
    });
  }

  // 4. Giả lập Quy trình Tạo mới -> Cập nhật -> Xóa Hồ sơ (Dossier CRUD)
  const testDossierCode = `SIM-TEST-${Date.now().toString().slice(-6)}`;
  let createdDossierId: string = '';

  await logStep('GIẢ LẬP HỒ SƠ', 'Tạo mới hồ sơ giả lập (POST /api/dossiers)', async () => {
    const newDoc = {
      code: testDossierCode,
      owner: 'Nguyễn Văn Giả Lập Test',
      phone: '0987654321',
      parcel: '123',
      mapSheet: '45',
      address: 'Thôn 1, Xã Thử Nghiệm',
      procedure: 'Cấp giấy lần đầu',
      receivedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      handlerId: 'user_lieulv',
      status: 'pending',
      note: 'Bản ghi kiểm thử giả lập tự động',
    };
    const res = await fetch(`${BASE_URL}/api/dossiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDoc),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    const created = await res.json();
    createdDossierId = created.id;
    return `Tạo thành công hồ sơ: ${created.code} (ID: ${created.id})`;
  });

  await logStep('GIẢ LẬP HỒ SƠ', 'Cập nhật trạng thái hồ sơ giả lập (PUT /api/dossiers/:id)', async () => {
    if (!createdDossierId) throw new Error('Không có ID hồ sơ để cập nhật');
    const res = await fetch(`${BASE_URL}/api/dossiers/${createdDossierId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'in_progress',
        note: 'Đã cập nhật qua kịch bản giả lập',
      }),
    });
    if (!res.ok) throw new Error(`Lỗi cập nhật: HTTP ${res.status}`);
    const updated = await res.json();
    if (updated.status !== 'in_progress') throw new Error('Trạng thái cập nhật không đúng');
    return `Cập nhật thành công trạng thái -> in_progress`;
  });

  await logStep('GIẢ LẬP HỒ SƠ', 'Dọn dẹp & Xóa hồ sơ giả lập (DELETE /api/dossiers/:id)', async () => {
    if (!createdDossierId) throw new Error('Không có ID hồ sơ để xóa');
    const res = await fetch(`${BASE_URL}/api/dossiers/${createdDossierId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Lỗi xóa: HTTP ${res.status}`);
    return `Đã xóa sạch hồ sơ thử nghiệm ID: ${createdDossierId}`;
  });

  // 5. Giả lập Quy trình Tạo mới & Xóa Nhiệm vụ (Task CRUD)
  const testTaskCode = `TASK-SIM-${Date.now().toString().slice(-5)}`;
  let createdTaskId: string = '';

  await logStep('GIẢ LẬP NHIỆM VỤ', 'Tạo mới nhiệm vụ giả lập (POST /api/tasks)', async () => {
    const newTask = {
      code: testTaskCode,
      name: 'Kiểm tra thực địa ranh giới đất thử nghiệm',
      field: 'Đo đạc và bản đồ',
      priority: 'high',
      assigneeId: 'user_lieulv',
      status: 'pending',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      direction: 'Chỉ đạo kiểm thử hệ thống tự động',
      progress: 0,
    };
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }
    const created = await res.json();
    createdTaskId = created.id;
    return `Tạo thành công nhiệm vụ: ${created.code}`;
  });

  await logStep('GIẢ LẬP NHIỆM VỤ', 'Dọn dẹp & Xóa nhiệm vụ giả lập (DELETE /api/tasks/:id)', async () => {
    if (!createdTaskId) throw new Error('Không có ID nhiệm vụ');
    const res = await fetch(`${BASE_URL}/api/tasks/${createdTaskId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Lỗi xóa: HTTP ${res.status}`);
    return `Đã dọn dẹp sạch nhiệm vụ thử nghiệm: ${createdTaskId}`;
  });

  // 6. Kiểm tra tính toàn vẹn cơ sở dữ liệu qua endpoint chuyên dụng
  await logStep('TOÀN VẸN HỆ THỐNG', 'Kiểm tra qua /api/system/integrity-check', async () => {
    const res = await fetch(`${BASE_URL}/api/system/integrity-check`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const audit = await res.json();
    if (audit.overallStatus !== 'HEALTHY') {
      throw new Error(`Phát hiện cảnh báo tính toàn vẹn: Trạng thái ${audit.overallStatus}`);
    }
    return `Trạng thái: HOÀN HẢO KHỎE MẠNH (${audit.summary?.totalCollections} danh mục, ${audit.summary?.totalRecordsInMemory} bản ghi, 0 cảnh báo)`;
  });

  // 7. Báo cáo tổng hợp
  console.log('\n===============================================================');
  console.log('📊 KẾT QUẢ TỔNG HỢP KIỂM TRA GIẢ LẬP');
  console.log('===============================================================');
  
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log(`Tổng các bước kiểm tra : ${total}`);
  console.log(`Thành công (PASS)       : ${passed}/${total} (${Math.round((passed / total) * 100)}%)`);
  console.log(`Lỗi phát hiện (FAIL)   : ${failed}/${total}`);
  console.log('---------------------------------------------------------------');
  console.table(
    results.map((r) => ({
      'Phân hệ': r.module,
      'Nội dung kiểm tra': r.step,
      'Kết quả': r.status === 'PASS' ? '✅ ĐẠT' : '❌ LỖI',
      'Thời gian': `${r.latencyMs}ms`,
      'Ghi chú': r.details.slice(0, 50),
    }))
  );

  if (failed === 0) {
    console.log('\n🎉 KẾT LUẬN: TẤT CẢ CÁC TÍNH NĂNG VÀ PHÂN HỆ ĐỀU HOẠT ĐỘNG HOÀN TOÀN TRƠN TRU, KHÔNG CÓ BẤT KỲ LỖI NÀO!');
  } else {
    console.log(`\n⚠️ CẢNH BÁO: Có ${failed} bước kiểm tra bị lỗi!`);
  }
}

runSimulation();
