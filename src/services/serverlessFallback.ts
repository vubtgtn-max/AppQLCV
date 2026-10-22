import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, Firestore } from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { LANH_NGOC_VILLAGES } from '../constants/procedures';

const STORAGE_KEY = 'qlcv_github_cloud_db_v2';

let firestoreInstance: Firestore | null = null;
let cloudLoadedOnce = false;
let cloudLoadingPromise: Promise<void> | null = null;
let realtimeWatchStarted = false;
let lastKnownMetaTimestamp = '';

function getClientFirestore(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;

  // Strict Security Barrier:
  // Reject file:// protocol, local intranet servers, and official agency hosts from making direct client-side Firestore SDK calls
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'file:') {
      console.warn('[SECURITY] Chế độ file:// bị từ chối kết nối trực tiếp đến Cloud Firestore.');
      return null;
    }
    const host = window.location.hostname;
    const isInternalOrAgency =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.gov.vn') ||
      /^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);

    if (isInternalOrAgency && !(window as any).__ALLOW_DEMO_SERVERLESS__) {
      return null;
    }
  }

  try {
    if (!firebaseAppletConfig?.projectId || !firebaseAppletConfig?.apiKey) return null;
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseAppletConfig);
    firestoreInstance = getFirestore(app, firebaseAppletConfig.firestoreDatabaseId || '(default)');
    if (!realtimeWatchStarted && typeof window !== 'undefined') {
      realtimeWatchStarted = true;
      try {
        onSnapshot(
          doc(firestoreInstance, 'system', 'meta'),
          (snap) => {
            if (!snap.exists()) return;
            const updatedAt = snap.data()?.updatedAt || '';
            if (updatedAt && updatedAt !== lastKnownMetaTimestamp) {
              lastKnownMetaTimestamp = updatedAt;
              pullFromCloudFirestore().then(() => {
                window.dispatchEvent(new CustomEvent('qlcv-cloud-updated'));
              });
            }
          },
          () => {}
        );
      } catch {}
    }
    return firestoreInstance;
  } catch (e) {
    console.warn('[ServerlessFallback] Firestore init warning:', e);
    return null;
  }
}

export function normalizeBookType(type: string): string {
  if (type === 'Sổ cấp GCN') return 'Sổ cấp giấy';
  if (type === 'Sổ đăng ký biến động') return 'Sổ theo dõi biến động';
  if (type === 'Sổ theo dõi khoáng sản') return 'Sổ theo dõi cấp phát phôi GCN';
  if (type === 'Sổ theo dõi tranh chấp') return 'Sổ theo dõi thu hồi GCN';
  if (type === 'Sổ theo dõi môi trường') return 'Sổ theo dõi HS tặng cho đất NN';
  return type;
}

function mergeById(localArr: any[], cloudArr: any[], deletedArr: any[] = []): any[] {
  const deletedIds = new Set(
    (deletedArr || []).map((d: any) => (typeof d === 'string' ? d : d?.id)).filter(Boolean)
  );
  const map = new Map<string, any>();
  for (const item of localArr || []) {
    if (item?.id && !deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  }
  for (const item of cloudArr || []) {
    if (!item?.id || deletedIds.has(item.id)) continue;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const tCloud = new Date(item.updatedAt || item.createdAt || 0).getTime();
      const tLocal = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      if (tCloud >= tLocal) {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

function getLocalDb(): any {
  const seed = (window as any).__INITIAL_DB_SNAPSHOT__ || {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        users: parsed.users?.length ? parsed.users : seed.users || [],
        tasks: parsed.tasks || seed.tasks || [],
        dossiers: parsed.dossiers || seed.dossiers || [],
        calendarEvents: parsed.calendarEvents || seed.calendarEvents || [],
        registerBooks: (parsed.registerBooks || seed.registerBooks || []).map((b: any) => ({
          ...b,
          type: normalizeBookType(b.type),
        })),
        documents: parsed.documents || seed.documents || [],
        notifications: parsed.notifications || seed.notifications || [],
        activityLogs: parsed.activityLogs || seed.activityLogs || [],
        alertLogs: parsed.alertLogs || seed.alertLogs || [],
        settings: parsed.settings || seed.settings || {},
        villages: parsed.villages?.length ? parsed.villages : seed.villages || [...LANH_NGOC_VILLAGES],
        projects: parsed.projects || seed.projects || [],
        disputes: parsed.disputes || seed.disputes || [],
        publicLands: parsed.publicLands || seed.publicLands || [],
        violations: parsed.violations || seed.violations || [],
        deletedDossiers: parsed.deletedDossiers || seed.deletedDossiers || [],
        deletedTasks: parsed.deletedTasks || seed.deletedTasks || [],
        deletedPublicLands: parsed.deletedPublicLands || seed.deletedPublicLands || [],
        deletedViolations: parsed.deletedViolations || seed.deletedViolations || [],
        deletedDisputes: parsed.deletedDisputes || seed.deletedDisputes || [],
        deletedRegisterBooks: parsed.deletedRegisterBooks || seed.deletedRegisterBooks || [],
      };
    }
  } catch {}

  const initial = {
    users: seed.users || [],
    tasks: seed.tasks || [],
    dossiers: seed.dossiers || [],
    calendarEvents: seed.calendarEvents || [],
    registerBooks: (seed.registerBooks || []).map((b: any) => ({
      ...b,
      type: normalizeBookType(b.type),
    })),
    documents: seed.documents || [],
    notifications: seed.notifications || [],
    activityLogs: seed.activityLogs || [],
    alertLogs: seed.alertLogs || [],
    settings: seed.settings || {},
    villages: seed.villages || [...LANH_NGOC_VILLAGES],
    projects: seed.projects || [],
    disputes: seed.disputes || [],
    publicLands: seed.publicLands || [],
    violations: seed.violations || [],
    deletedDossiers: seed.deletedDossiers || [],
    deletedTasks: seed.deletedTasks || [],
    deletedPublicLands: seed.deletedPublicLands || [],
    deletedViolations: seed.deletedViolations || [],
    deletedDisputes: seed.deletedDisputes || [],
    deletedRegisterBooks: seed.deletedRegisterBooks || [],
  };
  saveLocalDb(initial, false);
  return initial;
}

function saveLocalDb(dbData: any, syncCloud: boolean = true, targetCollection?: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
  } catch {}
  if (syncCloud) {
    pushToCloudFirestore(dbData, targetCollection).catch(() => {});
  }
}

async function pullFromCloudFirestore(): Promise<void> {
  const fsDb = getClientFirestore();
  if (!fsDb) return;
  try {
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
      getDoc(doc(fsDb, 'system', 'meta')),
      getDoc(doc(fsDb, 'system', 'projects')),
      getDoc(doc(fsDb, 'system', 'publicLands')),
      getDoc(doc(fsDb, 'system', 'violations')),
      getDoc(doc(fsDb, 'system', 'disputes')),
      getDoc(doc(fsDb, 'system', 'dossiers')),
      getDoc(doc(fsDb, 'system', 'tasks')),
      getDoc(doc(fsDb, 'system', 'users')),
      getDoc(doc(fsDb, 'system', 'settings')),
      getDoc(doc(fsDb, 'system', 'calendarEvents')),
      getDoc(doc(fsDb, 'system', 'registerBooks')),
      getDoc(doc(fsDb, 'system', 'documents')),
    ]);

    if (!metaSnap.exists()) return;
    const current = getLocalDb();

    if (dosSnap.exists()) {
      const del = dosSnap.data()?.deleted || current.deletedDossiers || [];
      current.deletedDossiers = del;
      if (Array.isArray(dosSnap.data()?.items)) {
        current.dossiers = mergeById(current.dossiers, dosSnap.data()!.items, del);
      }
    }
    if (tasksSnap.exists()) {
      const del = tasksSnap.data()?.deleted || current.deletedTasks || [];
      current.deletedTasks = del;
      if (Array.isArray(tasksSnap.data()?.items)) {
        current.tasks = mergeById(current.tasks, tasksSnap.data()!.items, del);
      }
    }
    if (projectsSnap.exists() && Array.isArray(projectsSnap.data()?.items)) {
      current.projects = projectsSnap.data()!.items;
    }
    if (pubLandSnap.exists()) {
      const del = pubLandSnap.data()?.deleted || current.deletedPublicLands || [];
      current.deletedPublicLands = del;
      if (Array.isArray(pubLandSnap.data()?.items)) {
        current.publicLands = mergeById(current.publicLands, pubLandSnap.data()!.items, del);
      }
    }
    if (violSnap.exists()) {
      const del = violSnap.data()?.deleted || current.deletedViolations || [];
      current.deletedViolations = del;
      if (Array.isArray(violSnap.data()?.items)) {
        current.violations = mergeById(current.violations, violSnap.data()!.items, del);
      }
    }
    if (dispSnap.exists()) {
      const del = dispSnap.data()?.deleted || current.deletedDisputes || [];
      current.deletedDisputes = del;
      if (Array.isArray(dispSnap.data()?.items)) {
        current.disputes = mergeById(current.disputes, dispSnap.data()!.items, del);
      }
    }
    if (usersSnap.exists() && Array.isArray(usersSnap.data()?.items) && usersSnap.data()!.items.length > 0) {
      current.users = mergeById(current.users, usersSnap.data()!.items);
    }
    if (settingsSnap.exists() && settingsSnap.data()?.settings) {
      current.settings = { ...current.settings, ...settingsSnap.data()!.settings };
    }
    if (calendarSnap.exists() && Array.isArray(calendarSnap.data()?.items)) {
      current.calendarEvents = calendarSnap.data()!.items;
    }
    if (booksSnap.exists()) {
      const del = booksSnap.data()?.deleted || current.deletedRegisterBooks || [];
      current.deletedRegisterBooks = del;
      if (Array.isArray(booksSnap.data()?.items)) {
        const cloudBooks = booksSnap.data()!.items.map((b: any) => ({
          ...b,
          type: normalizeBookType(b.type),
        }));
        current.registerBooks = mergeById(current.registerBooks || [], cloudBooks, del);
      }
    }
    if (docsSnap.exists() && Array.isArray(docsSnap.data()?.items)) {
      current.documents = docsSnap.data()!.items;
    }

    saveLocalDb(current, false);
  } catch (err) {
    console.warn('[ServerlessFallback] Pull from Firestore skipped:', err);
  }
}

async function pushToCloudFirestore(data: any, targetCollection?: string): Promise<void> {
  const fsDb = getClientFirestore();
  if (!fsDb) return;
  try {
    const clean = (v: any) => JSON.parse(JSON.stringify(v ?? []));
    const nowIso = new Date().toISOString();
    lastKnownMetaTimestamp = nowIso;

    const writes: Promise<any>[] = [
      setDoc(doc(fsDb, 'system', 'meta'), {
        updatedAt: nowIso,
        dossiersCount: data.dossiers?.length || 0,
        projectsCount: data.projects?.length || 0,
        tasksCount: data.tasks?.length || 0,
      }),
    ];

    const shouldSync = (col: string) => !targetCollection || targetCollection === col;

    if (shouldSync('projects')) {
      writes.push(setDoc(doc(fsDb, 'system', 'projects'), { items: clean(data.projects), updatedAt: nowIso }));
    }
    if (shouldSync('publicLands')) {
      writes.push(
        setDoc(doc(fsDb, 'system', 'publicLands'), {
          items: clean(data.publicLands),
          deleted: clean(data.deletedPublicLands),
          updatedAt: nowIso,
        })
      );
    }
    if (shouldSync('violations')) {
      writes.push(
        setDoc(doc(fsDb, 'system', 'violations'), {
          items: clean(data.violations),
          deleted: clean(data.deletedViolations),
          updatedAt: nowIso,
        })
      );
    }
    if (shouldSync('disputes')) {
      writes.push(
        setDoc(doc(fsDb, 'system', 'disputes'), {
          items: clean(data.disputes),
          deleted: clean(data.deletedDisputes),
          updatedAt: nowIso,
        })
      );
    }
    if (shouldSync('dossiers')) {
      writes.push(
        setDoc(doc(fsDb, 'system', 'dossiers'), {
          items: clean(data.dossiers),
          deleted: clean(data.deletedDossiers),
          updatedAt: nowIso,
        })
      );
    }
    if (shouldSync('tasks')) {
      writes.push(
        setDoc(doc(fsDb, 'system', 'tasks'), {
          items: clean(data.tasks),
          deleted: clean(data.deletedTasks),
          updatedAt: nowIso,
        })
      );
    }
    if (shouldSync('users')) {
      writes.push(setDoc(doc(fsDb, 'system', 'users'), { items: clean(data.users), updatedAt: nowIso }));
    }
    if (shouldSync('settings')) {
      writes.push(setDoc(doc(fsDb, 'system', 'settings'), { settings: clean(data.settings || {}), updatedAt: nowIso }));
    }
    if (shouldSync('calendarEvents')) {
      writes.push(setDoc(doc(fsDb, 'system', 'calendarEvents'), { items: clean(data.calendarEvents), updatedAt: nowIso }));
    }
    if (shouldSync('registerBooks')) {
      writes.push(
        setDoc(doc(fsDb, 'system', 'registerBooks'), {
          items: clean(data.registerBooks),
          deleted: clean(data.deletedRegisterBooks || []),
          updatedAt: nowIso,
        })
      );
    }
    if (shouldSync('documents')) {
      writes.push(setDoc(doc(fsDb, 'system', 'documents'), { items: clean(data.documents), updatedAt: nowIso }));
    }

    await Promise.all(writes);
  } catch (err) {
    console.warn('[ServerlessFallback] Push to Firestore skipped:', err);
  }
}

export async function handleServerlessApi(endpoint: string, options?: RequestInit): Promise<any> {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    throw new Error(
      'Ứng dụng QLCV Đất đai không được phép chạy trực tiếp qua giao thức file:// để bảo vệ an toàn dữ liệu địa chính. Vui lòng khởi động máy chủ và truy cập qua HTTP/HTTPS nội bộ.'
    );
  }

  if (!cloudLoadedOnce) {
    if (!cloudLoadingPromise) {
      cloudLoadingPromise = pullFromCloudFirestore().finally(() => {
        cloudLoadedOnce = true;
      });
    }
    await cloudLoadingPromise;
  }

  const method = (options?.method || 'GET').toUpperCase();
  const body = options?.body && typeof options.body === 'string' ? JSON.parse(options.body) : {};
  const pathOnly = endpoint.split('?')[0];
  const db = getLocalDb();
  const nowIso = new Date().toISOString();

  // 1. Snapshot
  if (pathOnly === '/sync/snapshot' && method === 'GET') {
    pullFromCloudFirestore().catch(() => {});
    return db;
  }

  // 2. Auth
  if (pathOnly === '/auth/login' && method === 'POST') {
    const uname = String(body.username || '').trim().toLowerCase();
    const pwd = String(body.password || '').trim();
    const found = (db.users || []).find(
      (u: any) =>
        String(u.username || '').toLowerCase() === uname ||
        String(u.email || '').toLowerCase() === uname ||
        String(u.id || '').toLowerCase() === uname
    );
    if (!found) {
      throw new Error('Tên đăng nhập không tồn tại trong hệ thống.');
    }
    if (found.password && pwd && found.password !== pwd) {
      throw new Error('Mật khẩu không chính xác.');
    }
    return { user: found, token: `serverless-token-${found.id}` };
  }

  if (pathOnly === '/auth/change-password' && method === 'POST') {
    const { userId, newPassword } = body;
    db.users = (db.users || []).map((u: any) =>
      u.id === userId ? { ...u, password: newPassword, updatedAt: nowIso } : u
    );
    saveLocalDb(db, true, 'users');
    return { message: 'Đổi mật khẩu thành công.' };
  }

  if (pathOnly === '/auth/register' && method === 'POST') {
    const newUser = {
      id: `user_${Date.now()}`,
      name: body.name || body.username,
      username: body.username,
      email: body.email || '',
      phone: body.phone || '',
      position: body.position || 'Chuyên viên',
      role: 'specialist',
      status: 'active',
      approved: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.users.push(newUser);
    saveLocalDb(db, true, 'users');
    return { message: 'Đăng ký tài khoản thành công.', user: newUser };
  }

  // User management special actions
  const userActionMatch = pathOnly.match(/^\/users\/([^/]+)\/(approve|toggle-lock|reset-password)$/);
  if (userActionMatch && method === 'POST') {
    const uid = decodeURIComponent(userActionMatch[1]);
    const action = userActionMatch[2];
    let targetUser: any = null;
    db.users = (db.users || []).map((u: any) => {
      if (u.id !== uid) return u;
      if (action === 'approve') targetUser = { ...u, approved: true, status: 'active', updatedAt: nowIso };
      if (action === 'toggle-lock')
        targetUser = { ...u, status: u.status === 'locked' ? 'active' : 'locked', updatedAt: nowIso };
      if (action === 'reset-password')
        targetUser = { ...u, password: body.newPassword || '123456', updatedAt: nowIso };
      return targetUser;
    });
    saveLocalDb(db, true, 'users');
    return action === 'reset-password'
      ? { message: 'Đã đặt lại mật khẩu.', user: targetUser, newPassword: body.newPassword || '123456' }
      : targetUser;
  }

  // Villages
  if (pathOnly === '/villages') {
    if (method === 'GET') return db.villages || [...LANH_NGOC_VILLAGES];
    if (method === 'POST' && body.village) {
      const list = Array.from(new Set([...(db.villages || LANH_NGOC_VILLAGES), body.village.trim()]));
      db.villages = list;
      saveLocalDb(db, false);
      return { message: 'Đã thêm thôn.', villages: list };
    }
  }
  if (pathOnly.startsWith('/villages/') && method === 'DELETE') {
    const v = decodeURIComponent(pathOnly.slice('/villages/'.length));
    db.villages = (db.villages || LANH_NGOC_VILLAGES).filter((item: string) => item !== v);
    saveLocalDb(db, false);
    return { message: 'Đã xóa thôn.', villages: db.villages };
  }

  // Smart Alerts endpoints (must return arrays where expected)
  if (pathOnly === '/alerts/logs' && method === 'GET') {
    return db.alertLogs || [];
  }
  if (pathOnly === '/alerts/logs/clear' && method === 'POST') {
    db.alertLogs = [];
    saveLocalDb(db, false);
    return { message: 'Đã xóa lịch sử cảnh báo.' };
  }
  if (pathOnly.startsWith('/alerts/logs/') && method === 'DELETE') {
    const logId = decodeURIComponent(pathOnly.slice('/alerts/logs/'.length));
    db.alertLogs = (db.alertLogs || []).filter((l: any) => l.id !== logId);
    saveLocalDb(db, false);
    return { message: 'Đã xóa bản ghi cảnh báo.' };
  }
  if (pathOnly === '/alerts/pending' && method === 'GET') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pending: any[] = [];
    for (const d of db.dossiers || []) {
      if (d.status === 'resolved' || d.status === 'cancelled' || !d.dueDate) continue;
      const due = new Date(d.dueDate);
      due.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86400000);
      if (daysLeft <= 5) {
        pending.push({
          id: d.id,
          type: 'dossier',
          code: d.code,
          title: `${d.procedure} - ${d.owner}`,
          assigneeId: d.handlerId,
          assigneeName: d.handlerName,
          dueDate: d.dueDate,
          daysLeft,
          urgency: daysLeft < 0 ? 'overdue' : daysLeft <= 2 ? 'critical' : 'warning',
        });
      }
    }
    return pending;
  }
  if (pathOnly === '/alerts/scan-now' && method === 'POST') {
    return { message: 'Đã quét cảnh báo hoàn tất.', result: { scanned: (db.dossiers || []).length, alertsSent: 0, details: [] } };
  }
  if (pathOnly === '/alerts/send-direct' && method === 'POST') {
    const newLog = {
      id: `alog_${Date.now()}`,
      channel: (body.channels && body.channels[0]) || 'in_app',
      trigger: body.trigger || 'manual',
      targetType: body.targetType,
      targetId: body.targetId,
      targetCode: body.targetCode,
      recipientId: body.recipientId,
      recipientName: 'Cán bộ',
      title: body.customTitle || 'Thông báo đôn đốc',
      content: body.customContent || '',
      status: 'sent',
      sentAt: nowIso,
    };
    db.alertLogs = [newLog, ...(db.alertLogs || [])];
    saveLocalDb(db, false);
    return { message: 'Đã gửi thông báo đôn đốc.', logs: [newLog] };
  }
  if (pathOnly === '/alerts/test-channel' && method === 'POST') {
    const log = {
      id: `alog_${Date.now()}`,
      channel: body.channel || 'telegram',
      trigger: 'test',
      recipientName: 'Kiểm tra kết nối',
      title: 'Tin nhắn kiểm tra',
      content: body.testMessage || 'Kiểm tra kết nối thành công',
      status: 'sent',
      sentAt: nowIso,
    };
    return { message: 'Kiểm tra kênh thông báo thành công.', log, success: true };
  }
  if (pathOnly === '/alerts/config' && method === 'PUT') {
    db.settings = {
      ...(db.settings || {}),
      alertConfig: { ...(db.settings?.alertConfig || {}), ...body },
    };
    saveLocalDb(db, true, 'settings');
    return { message: 'Đã lưu cấu hình cảnh báo.', alertConfig: db.settings.alertConfig };
  }

  // Notifications special endpoints
  if (pathOnly === '/notifications/read-all' && method === 'POST') {
    db.notifications = (db.notifications || []).map((n: any) =>
      !body.userId || n.userId === body.userId ? { ...n, isRead: true } : n
    );
    saveLocalDb(db, false);
    return { success: true };
  }
  if (pathOnly === '/notifications/clear-all' && method === 'POST') {
    db.notifications = body.userId
      ? (db.notifications || []).filter((n: any) => n.userId !== body.userId)
      : [];
    saveLocalDb(db, false);
    return { success: true };
  }
  const notifReadMatch = pathOnly.match(/^\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'POST') {
    const nid = decodeURIComponent(notifReadMatch[1]);
    db.notifications = (db.notifications || []).map((n: any) =>
      n.id === nid ? { ...n, isRead: true } : n
    );
    saveLocalDb(db, false);
    return { success: true };
  }

  // Activity logs clear
  if (pathOnly === '/activity-logs/clear' && method === 'POST') {
    db.activityLogs = [];
    saveLocalDb(db, false);
    return { message: 'Đã xóa nhật ký.' };
  }

  // Migration & Backups
  if (pathOnly === '/migration/backups' && method === 'GET') {
    return [
      {
        filename: 'snapshot_cloud_firestore_latest.json',
        createdAt: nowIso,
        size: JSON.stringify(db).length,
        dossiersCount: (db.dossiers || []).length,
        tasksCount: (db.tasks || []).length,
        reason: 'Bản sao lưu tự động trên trình duyệt & Cloud Firestore',
      },
    ];
  }
  if (pathOnly === '/migration/backups/create' && method === 'POST') {
    saveLocalDb(db, true);
    return { message: 'Đã tạo bản sao lưu đồng bộ Cloud thành công.', filename: `backup_${Date.now()}.json` };
  }
  if (pathOnly === '/migration/import' && method === 'POST') {
    const merged = { ...db, ...body };
    saveLocalDb(merged, true);
    return { message: 'Đã khôi phục dữ liệu thành công.', stats: { dossiers: (merged.dossiers || []).length } };
  }
  if (pathOnly === '/migration/reset-sample' && method === 'POST') {
    const seed = (window as any).__INITIAL_DB_SNAPSHOT__ || {};
    saveLocalDb(seed, true);
    return { message: 'Đã khôi phục dữ liệu gốc thành công.' };
  }

  // Dossiers special endpoints
  if (pathOnly === '/dossiers/deleted' && method === 'GET') {
    return db.deletedDossiers || [];
  }
  if (pathOnly === '/dossiers/restore-standard-60' && method === 'POST') {
    const seed = (window as any).__INITIAL_DB_SNAPSHOT__ || {};
    db.deletedDossiers = [];
    db.dossiers = mergeById(db.dossiers || [], seed.dossiers || [], []);
    saveLocalDb(db, true, 'dossiers');
    return { message: 'Đã khôi phục bộ hồ sơ chuẩn.', total: db.dossiers.length };
  }
  if (pathOnly === '/dossiers/restore-all-deleted' && method === 'POST') {
    const restored = (db.deletedDossiers || []).filter((d: any) => d && typeof d === 'object' && d.code);
    db.dossiers = [...restored, ...(db.dossiers || [])];
    db.deletedDossiers = [];
    saveLocalDb(db, true, 'dossiers');
    return { message: 'Đã khôi phục toàn bộ hồ sơ đã xóa.', restoredCount: restored.length };
  }
  const restoreOneMatch = pathOnly.match(/^\/dossiers\/restore-deleted\/([^/]+)$/);
  if (restoreOneMatch && method === 'POST') {
    const rid = decodeURIComponent(restoreOneMatch[1]);
    const target = (db.deletedDossiers || []).find((d: any) => d?.id === rid);
    if (target) {
      db.dossiers = [target, ...(db.dossiers || [])];
    }
    db.deletedDossiers = (db.deletedDossiers || []).filter((d: any) => (d?.id || d) !== rid);
    saveLocalDb(db, true, 'dossiers');
    return { message: 'Đã khôi phục hồ sơ.', dossier: target };
  }

  // Batch routes
  if (pathOnly === '/tasks/batch' && method === 'POST') {
    const incoming = (body.tasks || []).map((t: any, i: number) => ({
      ...t,
      id: t.id || `task_${Date.now()}_${i}`,
      createdAt: t.createdAt || nowIso,
      updatedAt: nowIso,
    }));
    db.tasks = [...incoming, ...(db.tasks || [])];
    saveLocalDb(db, true, 'tasks');
    return { message: 'Đã nhập nhiệm vụ thành công', count: incoming.length, tasks: incoming };
  }

  if (pathOnly === '/dossiers/batch' && method === 'POST') {
    const incoming = (body.dossiers || []).map((d: any, i: number) => ({
      ...d,
      id: d.id || `dos_${Date.now()}_${i}`,
      createdAt: d.createdAt || nowIso,
      updatedAt: nowIso,
    }));
    db.dossiers = [...incoming, ...(db.dossiers || [])];
    saveLocalDb(db, true, 'dossiers');
    return { message: 'Đã nhập hồ sơ thành công', count: incoming.length, dossiers: incoming };
  }

  if (pathOnly === '/register-books/batch' && method === 'POST') {
    const incoming = (body.books || []).map((b: any, i: number) => ({
      ...b,
      id: b.id || `book_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      type: normalizeBookType(b.type || 'Sổ cấp giấy'),
      createdAt: b.createdAt || nowIso,
      updatedAt: nowIso,
    }));
    db.registerBooks = [...incoming, ...(db.registerBooks || [])];
    saveLocalDb(db, true, 'registerBooks');
    return { message: 'Đã nhập sổ theo dõi thành công', count: incoming.length, books: incoming };
  }

  // Project households sub-routes
  const hhMatch = pathOnly.match(/^\/projects\/([^/]+)\/households(?:\/([^/]+))?$/);
  if (hhMatch) {
    const projectId = decodeURIComponent(hhMatch[1]);
    const subSegment = hhMatch[2] ? decodeURIComponent(hhMatch[2]) : null;
    const project = (db.projects || []).find((p: any) => p.id === projectId);
    if (!project) throw new Error('Không tìm thấy dự án.');
    project.households = project.households || [];

    if (subSegment === 'batch' && method === 'POST') {
      const startNum = project.households.length + 1;
      const added = (body.households || []).map((h: any, idx: number) => ({
        ...h,
        id: h.id || `hh_${Date.now()}_${idx}`,
        householdNumber: h.householdNumber || startNum + idx,
        createdAt: nowIso,
        updatedAt: nowIso,
      }));
      project.households.push(...added);
      project.updatedAt = nowIso;
      saveLocalDb(db, true, 'projects');
      return { message: 'Đã nhập danh sách hộ dân', count: added.length };
    }
    if (!subSegment && method === 'POST') {
      const newHh = {
        ...body,
        id: body.id || `hh_${Date.now()}`,
        householdNumber: body.householdNumber || project.households.length + 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      project.households.push(newHh);
      project.updatedAt = nowIso;
      saveLocalDb(db, true, 'projects');
      return newHh;
    }
    if (subSegment && method === 'PUT') {
      let updatedHh: any = null;
      project.households = project.households.map((h: any) => {
        if (h.id === subSegment) {
          updatedHh = { ...h, ...body, updatedAt: nowIso };
          return updatedHh;
        }
        return h;
      });
      project.updatedAt = nowIso;
      saveLocalDb(db, true, 'projects');
      return updatedHh;
    }
    if (subSegment && method === 'DELETE') {
      const target = project.households.find((h: any) => h.id === subSegment);
      project.households = project.households
        .filter((h: any) => h.id !== subSegment)
        .map((h: any, idx: number) => ({ ...h, householdNumber: idx + 1 }));
      project.updatedAt = nowIso;
      saveLocalDb(db, true, 'projects');
      return { message: 'Đã xóa hộ dân.', household: target };
    }
  }

  // Disputes sub-routes
  const dispSubMatch = pathOnly.match(
    /^\/disputes\/([^/]+)\/(verification-minute|generate-examination-report|examination-report|mediation)$/
  );
  if (dispSubMatch) {
    const dispId = decodeURIComponent(dispSubMatch[1]);
    const subAction = dispSubMatch[2];
    const dispute = (db.disputes || []).find((d: any) => d.id === dispId);
    if (!dispute) throw new Error('Không tìm thấy hồ sơ tranh chấp.');

    if (subAction === 'verification-minute' && method === 'POST') {
      dispute.verificationMinute = { ...body, updatedAt: nowIso };
      dispute.updatedAt = nowIso;
      saveLocalDb(db, true, 'disputes');
      return dispute;
    }
    if (subAction === 'generate-examination-report' && method === 'POST') {
      const report = {
        reportNumber: `BC-KTXM/${new Date().getFullYear()}`,
        reportDate: nowIso.split('T')[0],
        summary: dispute.content || '',
        conclusion: dispute.verificationMinute?.conclusion || '',
        proposal: 'Tổ chức hòa giải theo quy định Luật Đất đai.',
      };
      dispute.examinationReport = report;
      dispute.updatedAt = nowIso;
      saveLocalDb(db, true, 'disputes');
      return { message: 'Đã tạo báo cáo thẩm tra.', report, dispute };
    }
    if (subAction === 'examination-report' && method === 'PUT') {
      dispute.examinationReport = { ...(dispute.examinationReport || {}), ...body, updatedAt: nowIso };
      dispute.updatedAt = nowIso;
      saveLocalDb(db, true, 'disputes');
      return dispute;
    }
    if (subAction === 'mediation' && method === 'POST') {
      dispute.mediationRecords = [...(dispute.mediationRecords || []), { id: `med_${Date.now()}`, ...body }];
      dispute.updatedAt = nowIso;
      saveLocalDb(db, true, 'disputes');
      return dispute;
    }
  }

  // Public lands sub-routes
  const plSubMatch = pathOnly.match(/^\/public-lands\/([^/]+)\/(contracts|payments)$/);
  if (plSubMatch && method === 'POST') {
    const plId = decodeURIComponent(plSubMatch[1]);
    const subAction = plSubMatch[2];
    const parcel = (db.publicLands || []).find((p: any) => p.id === plId);
    if (!parcel) throw new Error('Không tìm thấy thửa đất công ích.');
    if (subAction === 'contracts') {
      parcel.currentContract = { id: `ct_${Date.now()}`, ...body };
      parcel.status = 'leased';
    } else if (subAction === 'payments') {
      parcel.paymentHistory = [...(parcel.paymentHistory || []), { id: `pay_${Date.now()}`, ...body }];
    }
    parcel.updatedAt = nowIso;
    saveLocalDb(db, true, 'publicLands');
    return parcel;
  }

  // Violations sub-routes
  const violSubMatch = pathOnly.match(/^\/violations\/([^/]+)\/evidences$/);
  if (violSubMatch && method === 'POST') {
    const vId = decodeURIComponent(violSubMatch[1]);
    const vItem = (db.violations || []).find((v: any) => v.id === vId);
    if (!vItem) throw new Error('Không tìm thấy hồ sơ vi phạm.');
    vItem.evidences = [...(vItem.evidences || []), { id: `ev_${Date.now()}`, ...body, uploadedAt: nowIso }];
    vItem.updatedAt = nowIso;
    saveLocalDb(db, true, 'violations');
    return vItem;
  }

  // System integrity check
  if (pathOnly === '/system/integrity-check') {
    return {
      status: 'healthy',
      timestamp: nowIso,
      totalDossiers: (db.dossiers || []).length,
      totalTasks: (db.tasks || []).length,
      totalProjects: (db.projects || []).length,
      totalRegisterBooks: (db.registerBooks || []).length,
      issues: [],
    };
  }
  if (pathOnly === '/system/integrity-repair' && method === 'POST') {
    saveLocalDb(db, true);
    return { success: true, message: 'Đã đồng bộ và kiểm tra toàn vẹn dữ liệu.', report: { fixed: 0 } };
  }

  // Generic Collection CRUD helper with Tombstone Recording
  const deletedKeyMap: Record<string, string> = {
    dossiers: 'deletedDossiers',
    tasks: 'deletedTasks',
    publicLands: 'deletedPublicLands',
    violations: 'deletedViolations',
    disputes: 'deletedDisputes',
    registerBooks: 'deletedRegisterBooks',
  };

  const handleCollectionCrud = (
    collectionKey: string,
    basePath: string,
    idPrefix: string,
    wrapDeleteKey?: string
  ) => {
    if (pathOnly === basePath && method === 'GET') {
      return db[collectionKey] || [];
    }
    if (pathOnly === basePath && method === 'POST') {
      const newItem = {
        ...body,
        id: body.id || `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: body.createdAt || nowIso,
        updatedAt: nowIso,
      };
      if (collectionKey === 'registerBooks') {
        newItem.type = normalizeBookType(newItem.type);
      }
      db[collectionKey] = [newItem, ...(db[collectionKey] || [])];
      saveLocalDb(db, true, collectionKey);
      return newItem;
    }
    if (pathOnly.startsWith(`${basePath}/`)) {
      const rest = pathOnly.slice(basePath.length + 1);
      const parts = rest.split('/');
      const id = decodeURIComponent(parts[0]);

      if (parts.length === 1 && method === 'GET') {
        return (db[collectionKey] || []).find((item: any) => item.id === id);
      }
      if (parts.length === 1 && method === 'PUT') {
        let updatedItem: any = null;
        db[collectionKey] = (db[collectionKey] || []).map((item: any) => {
          if (item.id === id) {
            updatedItem = { ...item, ...body, updatedAt: nowIso };
            if (collectionKey === 'registerBooks') {
              updatedItem.type = normalizeBookType(updatedItem.type);
            }
            return updatedItem;
          }
          return item;
        });
        saveLocalDb(db, true, collectionKey);
        return updatedItem || { id, ...body };
      }
      if (parts.length === 1 && method === 'DELETE') {
        const target = (db[collectionKey] || []).find((item: any) => item.id === id);
        db[collectionKey] = (db[collectionKey] || []).filter((item: any) => item.id !== id);
        const delKey = deletedKeyMap[collectionKey];
        if (delKey) {
          db[delKey] = [
            ...(db[delKey] || []),
            target ? { ...target, deletedAt: nowIso } : { id, deletedAt: nowIso },
          ];
        }
        saveLocalDb(db, true, collectionKey);
        return wrapDeleteKey
          ? { message: 'Đã xóa thành công.', [wrapDeleteKey]: target || { id } }
          : { message: 'Đã xóa thành công.' };
      }
    }
    return undefined;
  };

  for (const [colKey, basePath, prefix, delKey] of [
    ['users', '/users', 'user', 'user'],
    ['tasks', '/tasks', 'task', 'task'],
    ['dossiers', '/dossiers', 'dos', 'dossier'],
    ['calendarEvents', '/calendar', 'cal', 'event'],
    ['registerBooks', '/register-books', 'book', 'book'],
    ['documents', '/documents', 'doc', 'document'],
    ['projects', '/projects', 'proj', 'project'],
    ['disputes', '/disputes', 'disp', 'dispute'],
    ['publicLands', '/public-lands', 'pl', 'parcel'],
    ['violations', '/violations', 'viol', 'violation'],
    ['notifications', '/notifications', 'notif', 'notification'],
    ['activityLogs', '/activity-logs', 'log', 'log'],
  ] as const) {
    const res = handleCollectionCrud(colKey, basePath, prefix, delKey);
    if (res !== undefined) return res;
  }

  if (pathOnly === '/settings') {
    if (method === 'GET') return db.settings || {};
    if (method === 'PUT') {
      db.settings = { ...(db.settings || {}), ...body };
      saveLocalDb(db, true, 'settings');
      return db.settings;
    }
  }

  return { success: true, message: 'OK' };
}
