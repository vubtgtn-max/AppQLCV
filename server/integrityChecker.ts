import fs from 'fs';
import path from 'path';
import { db } from './db';
import { loadFromFirestore, syncToFirestore } from './firestoreSync';
import {
  Dossier,
  Task,
  LandViolationCase,
  DisputeCase,
  RegisterBook,
  LandProject,
  PublicLandParcel,
  User,
} from '../src/types';

export interface CollectionIntegrityReport {
  name: string;
  key: string;
  memoryCount: number;
  diskCount: number;
  cloudCount: number;
  backupCount: number;
  duplicates: string[];
  missingFields: { id: string; code?: string; field: string }[];
  brokenReferences: { id: string; code?: string; ref: string; detail: string }[];
  timelineWarnings: { id: string; code?: string; issue: string }[];
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  statusMessage: string;
}

export interface SystemIntegrityReport {
  timestamp: string;
  overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  summary: {
    totalCollections: number;
    healthyCount: number;
    warningCount: number;
    criticalCount: number;
    totalRecordsInMemory: number;
    totalRecordsInCloud: number;
  };
  collections: {
    tasks: CollectionIntegrityReport;
    dossiers: CollectionIntegrityReport;
    violations: CollectionIntegrityReport;
    disputes: CollectionIntegrityReport;
    registerBooks: CollectionIntegrityReport;
    projects: CollectionIntegrityReport;
    publicLands: CollectionIntegrityReport;
    users: CollectionIntegrityReport;
  };
  recommendations: string[];
}

export async function runDataIntegrityAudit(): Promise<SystemIntegrityReport> {
  await db.waitUntilReady();
  const memData = db.getData();

  // 1. Read Disk Data directly
  let diskData: any = {};
  const dbPath = path.resolve(process.cwd(), 'data', 'db.json');
  try {
    if (fs.existsSync(dbPath)) {
      diskData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
  } catch (err: any) {
    console.error('[INTEGRITY] Failed to read disk db.json:', err?.message);
  }

  // 2. Read Latest Backup Data
  let backupData: any = {};
  try {
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');
    if (fs.existsSync(backupDir)) {
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .reverse();
      if (files.length > 0) {
        backupData = JSON.parse(fs.readFileSync(path.join(backupDir, files[0]), 'utf-8'));
      }
    }
  } catch (err: any) {
    console.error('[INTEGRITY] Failed to read backup data:', err?.message);
  }

  // 3. Read Cloud Firestore Data
  let cloudData: any = {};
  try {
    cloudData = await loadFromFirestore();
  } catch (err: any) {
    console.error('[INTEGRITY] Failed to query Google Cloud Firestore:', err?.message);
  }

  const validUserIds = new Set((memData.users || []).map((u) => u.id));
  const validDossierIds = new Set((memData.dossiers || []).map((d) => d.id));
  const validDossierCodes = new Set((memData.dossiers || []).map((d) => d.code).filter(Boolean));

  // Helper audit function for any collection
  function auditCollection<T extends { id: string; code?: string }>(
    name: string,
    key: string,
    items: T[],
    diskItems: T[],
    cloudItems: T[],
    backupItems: T[],
    validator: (item: T, missing: { id: string; code?: string; field: string }[], broken: { id: string; code?: string; ref: string; detail: string }[], timeline: { id: string; code?: string; issue: string }[]) => void
  ): CollectionIntegrityReport {
    const memoryCount = items?.length || 0;
    const diskCount = diskItems?.length || 0;
    const cloudCount = cloudItems?.length || 0;
    const backupCount = backupItems?.length || 0;

    const duplicates: string[] = [];
    const missingFields: { id: string; code?: string; field: string }[] = [];
    const brokenReferences: { id: string; code?: string; ref: string; detail: string }[] = [];
    const timelineWarnings: { id: string; code?: string; issue: string }[] = [];

    const seenIds = new Set<string>();
    const seenCodes = new Set<string>();

    for (const item of items || []) {
      if (!item) continue;
      // ID check
      if (!item.id) {
        missingFields.push({ id: 'UNKNOWN', code: item.code, field: 'id' });
      } else if (seenIds.has(item.id)) {
        duplicates.push(`ID trùng lặp: ${item.id} [${item.code || ''}]`);
      } else {
        seenIds.add(item.id);
      }

      // Code check
      if (item.code) {
        if (seenCodes.has(item.code)) {
          duplicates.push(`Mã trùng lặp: ${item.code}`);
        } else {
          seenCodes.add(item.code);
        }
      }

      // Custom schema & relation validation
      validator(item, missingFields, brokenReferences, timelineWarnings);
    }

    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    const statusIssues: string[] = [];

    // Check layer count discrepancies
    if (memoryCount !== diskCount) {
      statusIssues.push(`Lệch số lượng RAM (${memoryCount}) vs Ổ cứng (${diskCount})`);
      status = 'WARNING';
    }
    if (cloudCount > 0 && Math.abs(memoryCount - cloudCount) > 0) {
      statusIssues.push(`Lệch số lượng Máy chủ (${memoryCount}) vs Đám mây (${cloudCount})`);
      status = 'WARNING';
    }
    const deletedMap: Record<string, any[]> = {
      tasks: (memData as any).deletedTasks || [],
      dossiers: (memData as any).deletedDossiers || [],
      publicLands: (memData as any).deletedPublicLands || [],
      violations: (memData as any).deletedViolations || [],
      disputes: (memData as any).deletedDisputes || [],
    };
    const intentionallyDeletedCount = (deletedMap[key] || []).length;
    if (backupCount > memoryCount && memoryCount === 0 && intentionallyDeletedCount < backupCount) {
      statusIssues.push(`Mất toàn bộ bản ghi so với bản sao lưu trước đó (${backupCount} -> 0)`);
      status = 'CRITICAL';
    }

    if (duplicates.length > 0) {
      statusIssues.push(`Có ${duplicates.length} bản ghi trùng mã/ID`);
      status = 'WARNING';
    }
    if (missingFields.length > 0) {
      statusIssues.push(`Có ${missingFields.length} lỗi thiếu trường thông tin cốt lõi`);
      if (status !== 'CRITICAL') status = 'WARNING';
    }
    if (brokenReferences.length > 0) {
      statusIssues.push(`Có ${brokenReferences.length} liên kết dữ liệu mồ côi/gãy`);
      if (status !== 'CRITICAL') status = 'WARNING';
    }

    let statusMessage = 'Hoàn hảo, đồng bộ 100% trên cả 3 tầng dữ liệu.';
    if (statusIssues.length > 0) {
      statusMessage = statusIssues.join('; ');
    }

    return {
      name,
      key,
      memoryCount,
      diskCount,
      cloudCount,
      backupCount,
      duplicates,
      missingFields,
      brokenReferences,
      timelineWarnings,
      status,
      statusMessage,
    };
  }

  // 1. Audit Tasks (Nhiệm vụ)
  const taskReport = auditCollection<Task>(
    'Nhiệm vụ & Công việc',
    'tasks',
    memData.tasks || [],
    diskData.tasks || [],
    cloudData.tasks || [],
    backupData.tasks || [],
    (t, missing, broken, timeline) => {
      if (!t.name) missing.push({ id: t.id, code: t.code, field: 'name (Tên nhiệm vụ)' });
      if (!t.status) missing.push({ id: t.id, code: t.code, field: 'status (Trạng thái)' });
      if (!t.startDate) missing.push({ id: t.id, code: t.code, field: 'startDate (Ngày bắt đầu)' });
      if (!t.dueDate) missing.push({ id: t.id, code: t.code, field: 'dueDate (Hạn chót)' });

      if (t.assigneeId && !validUserIds.has(t.assigneeId)) {
        broken.push({
          id: t.id,
          code: t.code,
          ref: 'assigneeId',
          detail: `Cán bộ thực hiện [${t.assigneeId}] không tồn tại trong danh mục người dùng`,
        });
      }

      if (t.linkedDossierId && !validDossierIds.has(t.linkedDossierId)) {
        broken.push({
          id: t.id,
          code: t.code,
          ref: 'linkedDossierId',
          detail: `Hồ sơ gắn kèm [${t.linkedDossierId}] không tìm thấy trong hệ thống`,
        });
      }

      if (t.startDate && t.dueDate && t.startDate > t.dueDate) {
        timeline.push({
          id: t.id,
          code: t.code,
          issue: `Ngày bắt đầu (${t.startDate}) lớn hơn ngày đến hạn (${t.dueDate})`,
        });
      }
    }
  );

  // 2. Audit Dossiers (Hồ sơ đất đai)
  const dossierReport = auditCollection<Dossier>(
    'Hồ sơ Đất đai (Một cửa)',
    'dossiers',
    memData.dossiers || [],
    diskData.dossiers || [],
    cloudData.dossiers || [],
    backupData.dossiers || [],
    (d, missing, broken, timeline) => {
      if (!d.code) missing.push({ id: d.id, code: d.code, field: 'code (Mã hồ sơ)' });
      if (!d.owner) missing.push({ id: d.id, code: d.code, field: 'owner (Tên chủ hồ sơ)' });
      if (!d.procedure) missing.push({ id: d.id, code: d.code, field: 'procedure (Thủ tục)' });
      if (!d.receivedDate) missing.push({ id: d.id, code: d.code, field: 'receivedDate (Ngày tiếp nhận)' });
      if (!d.dueDate) missing.push({ id: d.id, code: d.code, field: 'dueDate (Hạn trả kết quả)' });
      if (!d.status) missing.push({ id: d.id, code: d.code, field: 'status (Trạng thái hồ sơ)' });

      if (d.handlerId && !validUserIds.has(d.handlerId)) {
        broken.push({
          id: d.id,
          code: d.code,
          ref: 'handlerId',
          detail: `Cán bộ thụ lý [${d.handlerId}] không tồn tại trong danh mục người dùng`,
        });
      }

      if (d.receivedDate && d.dueDate && d.receivedDate > d.dueDate) {
        timeline.push({
          id: d.id,
          code: d.code,
          issue: `Ngày tiếp nhận (${d.receivedDate}) sau ngày hẹn trả (${d.dueDate})`,
        });
      }
    }
  );

  // 3. Audit Violations (Trật tự xây dựng & Vi phạm)
  const violationReport = auditCollection<LandViolationCase>(
    'Trật tự Xây dựng & Đất đai',
    'violations',
    memData.violations || [],
    diskData.violations || [],
    cloudData.violations || [],
    backupData.violations || [],
    (v, missing, broken, timeline) => {
      if (!v.violatorName) missing.push({ id: v.id, code: v.code, field: 'violatorName (Đối tượng vi phạm)' });
      if (!v.location) missing.push({ id: v.id, code: v.code, field: 'location (Địa điểm vi phạm)' });
      if (!v.violationType) missing.push({ id: v.id, code: v.code, field: 'violationType (Hành vi vi phạm)' });
      if (!v.status) missing.push({ id: v.id, code: v.code, field: 'status (Trạng thái xử lý)' });

      if (v.handlerId && !validUserIds.has(v.handlerId)) {
        broken.push({
          id: v.id,
          code: v.code,
          ref: 'handlerId',
          detail: `Cán bộ thụ lý [${v.handlerId}] không tồn tại trong danh mục người dùng`,
        });
      }
    }
  );

  // 4. Audit Disputes (Hòa giải tranh chấp)
  const disputeReport = auditCollection<DisputeCase>(
    'Hòa giải Tranh chấp Đất đai',
    'disputes',
    memData.disputes || [],
    diskData.disputes || [],
    cloudData.disputes || [],
    backupData.disputes || [],
    (disp, missing, broken, timeline) => {
      if (!disp.partyA?.name) missing.push({ id: disp.id, code: disp.code, field: 'partyA.name (Bên yêu cầu)' });
      if (!disp.partyB?.name) missing.push({ id: disp.id, code: disp.code, field: 'partyB.name (Bên bị yêu cầu)' });
      if (!disp.location) missing.push({ id: disp.id, code: disp.code, field: 'location (Vị trí thửa đất)' });
      if (!disp.status) missing.push({ id: disp.id, code: disp.code, field: 'status (Trạng thái giải quyết)' });

      if (disp.handlerId && !validUserIds.has(disp.handlerId)) {
        broken.push({
          id: disp.id,
          code: disp.code,
          ref: 'handlerId',
          detail: `Cán bộ giải quyết [${disp.handlerId}] không tồn tại trong danh mục người dùng`,
        });
      }
    }
  );

  // 5. Audit RegisterBooks (Sổ theo dõi hồ sơ/công văn)
  const registerBookReport = auditCollection<RegisterBook>(
    'Sổ Theo dõi & Sổ Mục kê',
    'registerBooks',
    memData.registerBooks || [],
    diskData.registerBooks || [],
    cloudData.registerBooks || [],
    backupData.registerBooks || [],
    (b, missing) => {
      if (!b.bookNumber) missing.push({ id: b.id, code: b.type, field: 'bookNumber (Số vào sổ)' });
      if (!b.type) missing.push({ id: b.id, code: b.type, field: 'type (Loại sổ theo dõi)' });
      if (!b.content) missing.push({ id: b.id, code: b.type, field: 'content (Nội dung trích yếu)' });
      if (!b.createdDate) missing.push({ id: b.id, code: b.type, field: 'createdDate (Ngày vào sổ)' });
    }
  );

  // 6. Audit Projects (Dự án GPMB)
  const projectReport = auditCollection<LandProject>(
    'Dự án Giải phóng Mặt bằng',
    'projects',
    memData.projects || [],
    diskData.projects || [],
    cloudData.projects || [],
    backupData.projects || [],
    (p, missing) => {
      if (!p.name) missing.push({ id: p.id, code: p.code, field: 'name (Tên dự án)' });
      if (!p.status) missing.push({ id: p.id, code: p.code, field: 'status (Trạng thái dự án)' });
    }
  );

  // 7. Audit Public Lands (Quỹ đất 5%)
  const pubLandReport = auditCollection<PublicLandParcel>(
    'Quỹ đất Công ích 5%',
    'publicLands',
    memData.publicLands || [],
    diskData.publicLands || [],
    cloudData.publicLands || [],
    backupData.publicLands || [],
    (pl, missing) => {
      if (!pl.parcel) missing.push({ id: pl.id, code: pl.code, field: 'parcel (Số thửa)' });
      if (!pl.mapSheet) missing.push({ id: pl.id, code: pl.code, field: 'mapSheet (Tờ bản đồ)' });
      if (!pl.area) missing.push({ id: pl.id, code: pl.code, field: 'area (Diện tích)' });
    }
  );

  // 8. Audit Users (Tài khoản)
  const userReport = auditCollection<User>(
    'Tài khoản & Phân quyền Cán bộ',
    'users',
    memData.users || [],
    diskData.users || [],
    cloudData.users || [],
    backupData.users || [],
    (u, missing) => {
      if (!u.name) missing.push({ id: u.id, code: u.username, field: 'name (Họ tên)' });
      if (!u.role) missing.push({ id: u.id, code: u.username, field: 'role (Chức vụ/Vai trò)' });
    }
  );

  const collections = {
    tasks: taskReport,
    dossiers: dossierReport,
    violations: violationReport,
    disputes: disputeReport,
    registerBooks: registerBookReport,
    projects: projectReport,
    publicLands: pubLandReport,
    users: userReport,
  };

  const list = Object.values(collections);
  const healthyCount = list.filter((c) => c.status === 'HEALTHY').length;
  const warningCount = list.filter((c) => c.status === 'WARNING').length;
  const criticalCount = list.filter((c) => c.status === 'CRITICAL').length;

  let overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
  if (criticalCount > 0) overallStatus = 'CRITICAL';
  else if (warningCount > 0) overallStatus = 'WARNING';

  const recommendations: string[] = [];
  if (warningCount > 0 || criticalCount > 0) {
    for (const c of list) {
      if (c.status !== 'HEALTHY') {
        recommendations.push(`[${c.name}]: ${c.statusMessage}`);
      }
    }
    recommendations.push(
      'Chạy lệnh tự động đồng bộ (Integrity Repair) để đồng nhất dữ liệu giữa RAM, Ổ đĩa máy chủ và Google Cloud Firestore.'
    );
  } else {
    recommendations.push('Toàn bộ cơ sở dữ liệu hoàn toàn toàn vẹn và đồng nhất 100% trên mọi tầng lưu trữ.');
  }

  const totalRecordsInMemory = list.reduce((acc, c) => acc + c.memoryCount, 0);
  const totalRecordsInCloud = list.reduce((acc, c) => acc + c.cloudCount, 0);

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    summary: {
      totalCollections: list.length,
      healthyCount,
      warningCount,
      criticalCount,
      totalRecordsInMemory,
      totalRecordsInCloud,
    },
    collections,
    recommendations,
  };
}

export async function repairDataIntegrity(): Promise<{ success: boolean; message: string; report: SystemIntegrityReport }> {
  console.log('[INTEGRITY_REPAIR] Initiating system-wide harmonization...');
  await db.waitUntilReady();

  // Repair any specific dossier date anomaly
  const currentMem = db.getData();
  let changed = false;
  if (Array.isArray(currentMem.dossiers)) {
    for (const d of currentMem.dossiers) {
      if (d.code === 'H17.130-260728-1335' && d.receivedDate === '2026-09-28') {
        d.receivedDate = '2026-07-28';
        changed = true;
      }
    }
  }

  // Repair orphan linkedDossierId on tasks
  if (Array.isArray(currentMem.tasks)) {
    const validDossierIdSet = new Set((currentMem.dossiers || []).map((d) => d.id));
    for (const t of currentMem.tasks) {
      if (t.linkedDossierId && !validDossierIdSet.has(t.linkedDossierId)) {
        const matched = (currentMem.dossiers || []).find((d) => {
          const ownerLower = (d.owner || '').trim().toLowerCase();
          return ownerLower.length > 0 && t.name.toLowerCase().includes(ownerLower);
        });
        if (matched) {
          t.linkedDossierId = matched.id;
          changed = true;
        } else {
          t.linkedDossierId = undefined;
          changed = true;
        }
      }
    }
  }

  // Force flush memory state to disk and cloud
  await db.save();
  const mem = db.getData();
  await syncToFirestore(mem);
  const freshReport = await runDataIntegrityAudit();
  return {
    success: freshReport.overallStatus === 'HEALTHY',
    message: changed
      ? 'Đã sửa chữa bất thường thời gian và đồng bộ toàn vẹn dữ liệu lên Google Cloud Firestore!'
      : 'Đã hoàn tất kiểm tra và đồng bộ toàn vẹn dữ liệu lên Google Cloud Firestore!',
    report: freshReport,
  };
}
