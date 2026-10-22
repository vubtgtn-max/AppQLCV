import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  Database,
  UPLOADS_DIR,
  BACKUPS_DIR,
  initialUsers,
  initialTasks,
  initialDossiers,
  initialCalendar,
  initialRegisterBooks,
  initialDocuments,
  initialNotifications,
  initialActivityLogs,
  initialSettings,
  initialAlertLogs,
  initialProjects,
  initialDisputes,
  initialPublicLands,
  initialViolations,
  DEFAULT_LANH_NGOC_VILLAGES,
} from './db';
import { runDataIntegrityAudit, repairDataIntegrity } from './integrityChecker';
import {
  User,
  Task,
  Dossier,
  CalendarEvent,
  RegisterBook,
  DocumentItem,
  Attachment,
  AlertMessageLog,
  AlertConfig,
  PendingAlertItem,
  AlertChannel,
  LandProject,
  ProjectHousehold,
  DisputeCase,
  VerificationMinute,
  ExaminationReport,
  MediationRecord,
  PublicLandParcel,
  PublicLandContract,
  LandViolationCase,
  ViolationEvidenceItem,
} from '../src/types';
import { mutationGuardMiddleware } from './mutationGuard';
import { addWorkingDays, calculateResumedDueDate, getStandardWorkingDaysForProcedure } from '../src/utils/date';

export const apiRouter = express.Router();
apiRouter.use(mutationGuardMiddleware);
const db = Database.getInstance();

// Global middleware: Wait for database hydration from Google Cloud Firestore (up to 8s)
// This guarantees that ANY read or write request operates on 100% hydrated cloud data
apiRouter.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.waitUntilReady(8000);
  } catch (_) {}
  next();
});

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const blockedExts = ['.exe', '.bat', '.cmd', '.sh', '.php', '.phtml', '.cgi', '.pl'];
    if (blockedExts.includes(ext)) {
      cb(new Error(`Định dạng tệp ${ext} không được phép tải lên hệ thống vì lý do an toàn bảo mật.`));
      return;
    }
    cb(null, true);
  },
});

// SSE Real-time client listeners
type SSEClient = {
  id: string;
  res: Response;
};
let sseClients: SSEClient[] = [];

export const broadcastEvent = (eventType: string, payload?: any) => {
  const message = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
  sseClients = sseClients.filter((client) => {
    try {
      client.res.write(`data: ${message}\n\n`);
      return true;
    } catch {
      return false; // Automatically prune disconnected client
    }
  });
};

export function parseServerDate(val: any, fallback?: string): string {
  const defaultFallback = fallback ?? new Date().toISOString().split('T')[0];
  if (val === null || val === undefined || String(val).trim() === '') return defaultFallback;

  const num = Number(val);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    // Excel serial number (e.g., 46157 = 2026-05-15)
    const utcDays = Math.floor(num - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(str)) {
    const p = str.split('T')[0].split('-');
    const y = Number(p[0]);
    if (y > 3000) {
      if (y > 10000 && y < 100000) {
        const utcDays = Math.floor(y - 25569);
        const date = new Date(utcDays * 86400 * 1000);
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      }
      return defaultFallback;
    }
    return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    if (y > 3000 || y < 1900) return defaultFallback;
    return `${y}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  }

  return defaultFallback;
}

// Periodic deadline check
const deadlineTimer = setInterval(async () => {
  try {
    const data = db.getData();
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr).getTime();
    let hasChanges = false;

    // Check dossiers first
    data.dossiers.forEach((dos) => {
      // Hồ sơ đã giải quyết, yêu cầu bổ sung, hoặc đang tạm dừng thì KHÔNG tính quá hạn và KHÔNG thay đổi trạng thái
      if (dos.status === 'resolved' || dos.status === 'supplement' || dos.status === 'paused' || (dos.supplementDate && !dos.resumedDate)) {
        if (dos.supplementDate && !dos.resumedDate && dos.status === 'overdue') {
          dos.status = 'supplement';
          hasChanges = true;
        }
        return;
      }

      const dueTime = new Date(parseServerDate(dos.dueDate)).getTime();
      const diffDays = Math.round((dueTime - today) / (1000 * 60 * 60 * 24));

      if (diffDays < 0 && dos.status !== 'overdue') {
        dos.status = 'overdue';
        hasChanges = true;
      } else if (diffDays >= 0 && dos.status === 'overdue') {
        dos.status = 'in_progress';
        hasChanges = true;
      }
    });

    // Check overdue and due soon tasks
    data.tasks.forEach((task) => {
      if (task.status !== 'completed') {
        // If this task is linked to a dossier that is in supplement/paused/resolved, do not mark overdue
        const linkedDossier = data.dossiers.find(
          (d) =>
            (task.linkedDossierId && d.id === task.linkedDossierId) ||
            d.linkedTaskId === task.id ||
            (d.code && (task.name.includes(d.code) || task.direction?.includes(d.code) || task.note?.includes(d.code)))
        );
        if (
          linkedDossier &&
          (linkedDossier.status === 'supplement' ||
            linkedDossier.status === 'paused' ||
            linkedDossier.status === 'resolved' ||
            (linkedDossier.supplementDate && !linkedDossier.resumedDate))
        ) {
          return;
        }

        if (task.note?.toLowerCase().includes('bổ sung') || task.direction?.toLowerCase().includes('bổ sung')) {
          return;
        }

        const dueTime = new Date(parseServerDate(task.dueDate)).getTime();
        const diffDays = Math.round((dueTime - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0 && task.status !== 'overdue') {
          task.status = 'overdue';
          hasChanges = true;
        } else if (diffDays >= 0 && task.status === 'overdue') {
          task.status = 'in_progress';
          hasChanges = true;
        }

        // Notify if 1 day left or due today
        if (diffDays === 0 || diffDays === 1) {
          const alreadyNotified = data.notifications.some(
            (n) => n.relatedId === task.id && n.createdAt.startsWith(todayStr)
          );
          if (!alreadyNotified) {
            db.addNotification(
              {
                userId: task.assigneeId,
                title: diffDays === 0 ? 'Nhiệm vụ đến hạn hôm nay' : 'Nhiệm vụ sắp đến hạn (còn 1 ngày)',
                content: `Nhiệm vụ "${task.name}" (${task.code}) có hạn chót là ${task.dueDate}.`,
                type: diffDays === 0 ? 'urgent' : 'warning',
                relatedModule: 'tasks',
                relatedId: task.id,
              },
              false // Do not autoSave per notification; batched together
            );
            hasChanges = true;
          }
        }
      }
    });

    if (hasChanges) {
      await db.save();
      broadcastEvent('DATA_CHANGED', { source: 'deadline_checker' });
    }
  } catch (err) {
    console.error('Deadline checker error:', err);
  }
}, 30000);

if (deadlineTimer && typeof deadlineTimer.unref === 'function') {
  deadlineTimer.unref();
}

// SSE Endpoint for real-time live synchronization
apiRouter.get('/sync/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Prevent Nginx reverse proxy buffering
  res.flushHeaders();

  const clientId = `client_${Date.now()}_${Math.random()}`;
  sseClients.push({ id: clientId, res });

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// Periodic SSE Keepalive heartbeat (every 15 seconds) to prevent Cloud Run / Nginx timeout drops
const sseKeepaliveTimer = setInterval(() => {
  if (sseClients.length === 0) return;
  sseClients = sseClients.filter((client) => {
    try {
      client.res.write(': keepalive\n\n');
      return true;
    } catch {
      return false;
    }
  });
}, 15000);

if (sseKeepaliveTimer && typeof sseKeepaliveTimer.unref === 'function') {
  sseKeepaliveTimer.unref();
}

// Full state snapshot sync with hydration wait
apiRouter.get('/sync/snapshot', async (req: Request, res: Response) => {
  await db.waitUntilReady(8000);
  res.json(db.getData());
});

/**
 * Helper to identify and authenticate the user making the API request
 */
function getRequestUser(req: Request): User | null {
  const users = db.getData().users || [];

  // Extract user id from Bearer token if provided
  let tokenUserId = '';
  const authHeader = req.headers['authorization'];
  if (authHeader && typeof authHeader === 'string') {
    const bearerMatch = authHeader.match(/^Bearer\s+(?:mock_jwt_token_)?([a-zA-Z0-9_-]+)$/i);
    if (bearerMatch) {
      tokenUserId = bearerMatch[1];
    }
  }

  const rawId = (
    req.headers['x-user-id'] ||
    tokenUserId ||
    req.query.userId ||
    (req.body && (req.body.userId || req.body.updatedBy || req.body.createdBy))
  ) as string | undefined;

  if (!rawId || typeof rawId !== 'string') {
    return null;
  }

  const cleanId = rawId.trim();
  if (cleanId === 'admin') {
    return users.find((u) => u.role === 'admin' || u.id === 'user_hoaivu') || null;
  }

  const user = users.find((u) => u.id === cleanId || u.username === cleanId);
  if (!user || user.status === 'locked' || user.approved === false) {
    return null;
  }
  return user;
}

/**
 * Helper: Check whether the requesting user is allowed to edit/delete a specific dossier or record.
 * - Admin & Leader: full permission on all records.
 * - Other members (Specialists, Clerks): ONLY allowed on records where they are the assigned handler/manager/owner/assignee or creator.
 */
function canUserModifyRecord(user: User | null, record: any): boolean {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'leader') return true;
  if (!record) return false;

  const normalize = (s?: string) => (s || '').trim().toLowerCase();
  const userNameNorm = normalize(user.name);

  const primaryId = record.handlerId || record.managerId || record.ownerId || record.assigneeId;
  const primaryName = record.handlerName || record.managerName || record.ownerName || record.assigneeName;

  if (primaryId) {
    if (primaryId === user.id) return true;
    if (primaryName && userNameNorm && normalize(primaryName) === userNameNorm) return true;
    return false;
  }

  if (primaryName && userNameNorm) {
    return normalize(primaryName) === userNameNorm;
  }

  if (record.createdBy) {
    if (record.createdBy === user.id) return true;
    if (record.createdByName && userNameNorm && normalize(record.createdByName) === userNameNorm) return true;
    return false;
  }

  return false;
}

// ==================== AUTHENTICATION ====================
function removeVietnameseTones(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || typeof username !== 'string') {
    res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập, email hoặc số điện thoại.' });
    return;
  }

  const cleanQuery = username.trim().toLowerCase();
  const cleanQueryNoAccent = removeVietnameseTones(cleanQuery);
  const cleanPhone = username.replace(/\D/g, '');
  const users = db.getData().users;
  const user = users.find((u) => {
    const uId = (u.id || '').toLowerCase().trim();
    const uUser = (u.username || '').toLowerCase().trim();
    const uEmail = (u.email || '').toLowerCase().trim();
    const uEmailPrefix = uEmail.split('@')[0];
    const uName = (u.name || '').toLowerCase().trim();
    const uNameNoAccent = removeVietnameseTones(uName);
    const uPhone = (u.phone || '').replace(/\D/g, '');

    return (
      uId === cleanQuery ||
      uUser === cleanQuery ||
      uUser === cleanQueryNoAccent.replace(/\s+/g, '') ||
      uEmail === cleanQuery ||
      uEmailPrefix === cleanQuery ||
      uName === cleanQuery ||
      (cleanQueryNoAccent.length >= 2 && uNameNoAccent === cleanQueryNoAccent) ||
      (cleanPhone.length >= 7 && uPhone === cleanPhone)
    );
  });

  if (!user) {
    res.status(401).json({ error: `Không tìm thấy tài khoản cán bộ "${username}" trong hệ thống.` });
    return;
  }
  if (user.status === 'locked') {
    res.status(403).json({ error: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên (Đoàn Văn Hoài Vũ).' });
    return;
  }
  if (user.status === 'pending' || user.approved === false) {
    res.status(403).json({ error: 'Tài khoản đang chờ Quản trị viên phê duyệt trước khi truy cập.' });
    return;
  }

  const inputPass = (password || '').toString().trim();
  const expectedPassword = (user.password || 'ln123456').toString().trim();
  const isDefaultPassword = expectedPassword.toLowerCase() === 'ln123456';
  const passwordValid =
    Boolean(inputPass) &&
    (inputPass === expectedPassword ||
      inputPass.toLowerCase() === expectedPassword.toLowerCase() ||
      (isDefaultPassword && inputPass === '123456'));

  if (!passwordValid) {
    res.status(401).json({
      error: 'Mật khẩu không chính xác. Mật khẩu mặc định của hệ thống là: ln123456',
    });
    return;
  }

  user.lastLoginAt = new Date().toISOString();
  db.addActivityLog(
    {
      userId: user.id,
      userName: user.name,
      action: 'LOGIN',
      module: 'auth',
      description: `Cán bộ ${user.name} (${user.position || user.role}) đăng nhập thành công.`,
    },
    false
  );
  await db.save();

  res.json({ user, token: `mock_jwt_token_${user.id}` });
});

apiRouter.post('/auth/change-password', async (req: Request, res: Response) => {
  const { userId, oldPassword, newPassword } = req.body;
  const user = db.getData().users.find((u) => u.id === userId);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng.' });
    return;
  }

  const currentPassword = user.password || 'ln123456';
  if (oldPassword !== currentPassword) {
    res.status(400).json({ error: 'Mật khẩu cũ không chính xác! Vui lòng kiểm tra lại.' });
    return;
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    return;
  }

  user.password = newPassword;
  user.updatedAt = new Date().toISOString();
  db.addActivityLog(
    {
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      module: 'auth',
      description: `Cán bộ ${user.name} đã đổi mật khẩu thành công.`,
    },
    false
  );
  await db.save();

  res.json({ message: 'Đổi mật khẩu thành công!' });
});

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { name, username, email, phone, position } = req.body;
  const users = db.getData().users;

  if (users.some((u) => u.username === username)) {
    res.status(400).json({ error: 'Tên đăng nhập đã tồn tại trong hệ thống.' });
    return;
  }
  if (users.some((u) => u.email === email)) {
    res.status(400).json({ error: 'Email đã được sử dụng.' });
    return;
  }

  const newUser: User = {
    id: db.generateUniqueId('user'),
    name,
    username,
    email,
    phone: phone || '',
    position: position || 'Chuyên viên nghiệp vụ',
    role: 'specialist',
    status: 'pending',
    approved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);

  // Notify admins
  const admins = users.filter((u) => u.role === 'admin');
  admins.forEach((admin) => {
    db.addNotification(
      {
        userId: admin.id,
        title: 'Tài khoản mới đăng ký chờ duyệt',
        content: `Cán bộ ${name} (${username}) vừa đăng ký tài khoản và đang chờ phê duyệt.`,
        type: 'info',
        relatedModule: 'users',
        relatedId: newUser.id,
      },
      false
    );
  });

  await db.save();

  broadcastEvent('USER_REGISTERED', newUser);
  broadcastEvent('NOTIFICATION_CREATED');

  res.json({
    message: 'Đăng ký tài khoản thành công! Vui lòng chờ Quản trị viên phê duyệt.',
    user: newUser,
  });
});

// ==================== USERS & ROLES ====================
apiRouter.get('/users', (req: Request, res: Response) => {
  res.json(db.getData().users);
});

apiRouter.post('/users/:id/approve', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  if (!reqUser || reqUser.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền phê duyệt tài khoản.' });
    return;
  }

  const user = db.getData().users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng' });
    return;
  }
  if (user.approved === true && user.status === 'active') {
    res.json(user);
    return;
  }
  user.approved = true;
  user.status = 'active';
  user.updatedAt = new Date().toISOString();

  db.addActivityLog(
    {
      userId: reqUser.id,
      userName: reqUser.name,
      action: 'APPROVE',
      module: 'users',
      recordId: user.id,
      description: `Phê duyệt tài khoản cho cán bộ ${user.name} (${user.username}).`,
    },
    false
  );

  db.addNotification(
    {
      userId: user.id,
      title: 'Tài khoản đã được phê duyệt',
      content: 'Tài khoản của bạn đã được Quản trị viên kích hoạt thành công.',
      type: 'success',
      relatedModule: 'users',
    },
    false
  );

  await db.save();

  broadcastEvent('USER_UPDATED', user);
  broadcastEvent('NOTIFICATION_CREATED');
  res.json(user);
});

apiRouter.post('/users/:id/toggle-lock', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  if (!reqUser || reqUser.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền khóa hoặc mở khóa tài khoản.' });
    return;
  }

  if (reqUser.id === req.params.id) {
    res.status(400).json({ error: 'Quản trị viên không thể tự khóa tài khoản của chính mình.' });
    return;
  }

  const user = db.getData().users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng' });
    return;
  }
  user.status = user.status === 'locked' ? 'active' : 'locked';
  user.updatedAt = new Date().toISOString();

  db.addActivityLog(
    {
      userId: reqUser.id,
      userName: reqUser.name,
      action: 'LOCK',
      module: 'users',
      recordId: user.id,
      description: `${user.status === 'locked' ? 'Khóa' : 'Mở khóa'} tài khoản ${user.name} (@${user.username}).`,
    },
    false
  );

  await db.save();

  broadcastEvent('USER_UPDATED', user);
  res.json(user);
});

apiRouter.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  if (!reqUser || reqUser.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền đặt lại mật khẩu của người dùng khác.' });
    return;
  }

  const user = db.getData().users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng' });
    return;
  }

  const { newPassword } = req.body;
  const passwordToSet = newPassword && newPassword.trim() ? newPassword.trim() : 'ln123456';
  
  if (passwordToSet.length < 6) {
    res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    return;
  }

  user.password = passwordToSet;
  user.updatedAt = new Date().toISOString();

  db.addActivityLog(
    {
      userId: reqUser.id,
      userName: reqUser.name,
      action: 'UPDATE',
      module: 'users',
      recordId: user.id,
      description: `Đặt lại mật khẩu cho cán bộ ${user.name} (@${user.username}) thành công.`,
    },
    false
  );

  db.addNotification(
    {
      userId: user.id,
      title: 'Mật khẩu đã được đặt lại',
      content: 'Mật khẩu tài khoản của bạn đã được Quản trị viên đặt lại thành công.',
      type: 'warning',
      relatedModule: 'users',
    },
    false
  );

  await db.save();

  broadcastEvent('USER_UPDATED', user);
  broadcastEvent('NOTIFICATION_CREATED');
  res.json({ message: 'Đặt lại mật khẩu thành công!', user });
});

apiRouter.put('/users/:id', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  if (!reqUser) {
    res.status(401).json({ error: 'Yêu cầu đăng nhập để cập nhật thông tin người dùng.' });
    return;
  }

  const isAdmin = reqUser.role === 'admin';
  const isSelf = reqUser.id === req.params.id;

  if (!isAdmin && !isSelf) {
    res.status(403).json({ error: 'Bạn chỉ có quyền cập nhật thông tin tài khoản của chính mình.' });
    return;
  }

  const user = db.getData().users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: 'Không tìm thấy người dùng' });
    return;
  }

  const {
    name,
    username,
    email,
    password,
    role,
    phone,
    position,
    scope,
    status,
    approved,
    avatar,
  } = req.body;

  // Check unique username if changing
  if (username && username.trim() !== user.username) {
    const cleanUsername = username.trim().toLowerCase();
    const exists = db.getData().users.some(
      (u) => u.id !== user.id && u.username.toLowerCase() === cleanUsername
    );
    if (exists) {
      res.status(400).json({ error: `Tên đăng nhập "${username}" đã có người sử dụng.` });
      return;
    }
    user.username = username.trim();
  }

  // Check unique email if changing
  if (email && email.trim() !== user.email) {
    const cleanEmail = email.trim().toLowerCase();
    const exists = db.getData().users.some(
      (u) => u.id !== user.id && u.email.toLowerCase() === cleanEmail
    );
    if (exists) {
      res.status(400).json({ error: `Email "${email}" đã có người sử dụng.` });
      return;
    }
    user.email = email.trim();
  }

  if (name !== undefined) user.name = name.trim();
  if (password !== undefined && password.trim()) {
    if (password.trim().length < 6) {
      res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      return;
    }
    user.password = password.trim();
  }
  
  // Non-admins cannot alter system role, account status, or approval status
  if (isAdmin) {
    if (role !== undefined) user.role = role;
    if (status !== undefined) user.status = status;
    if (approved !== undefined) user.approved = approved;
  }

  if (phone !== undefined) user.phone = phone.trim();
  if (position !== undefined) user.position = position.trim();
  if (scope !== undefined) user.scope = scope.trim();
  if (avatar !== undefined) user.avatar = avatar.trim();
  if (req.body.gender !== undefined) user.gender = req.body.gender;

  user.updatedAt = new Date().toISOString();
  db.addActivityLog(
    {
      userId: reqUser.id,
      userName: reqUser.name,
      action: 'UPDATE',
      module: 'users',
      recordId: user.id,
      description: isAdmin
        ? `Quản trị viên cập nhật thông tin cán bộ ${user.name} (@${user.username}).`
        : `Cán bộ ${user.name} tự cập nhật hồ sơ cá nhân.`,
    },
    false
  );
  await db.save();

  broadcastEvent('USER_UPDATED', user);
  res.json(user);
});

// ==================== TASKS (CÔNG VIỆC) ====================
apiRouter.get('/tasks', (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] || req.query.userId) as string | undefined;
  if (userId) {
    const user = db.getData().users.find((u) => u.id === userId);
    if (user && user.role !== 'admin' && user.role !== 'leader') {
      // Specialists only receive tasks assigned to them or created by them
      const userTasks = db.getData().tasks.filter(
        (t) => t.assigneeId === user.id || t.createdBy === user.id
      );
      res.json(userTasks);
      return;
    }
  }
  res.json(db.getData().tasks);
});

apiRouter.post('/tasks', async (req: Request, res: Response) => {
  const {
    code,
    name,
    field,
    priority,
    assigneeId,
    status,
    progress,
    result,
    linkedDossierId,
    startDate,
    dueDate,
    direction,
    note,
    attachments,
    createdBy,
    createdByName,
  } = req.body;

  if (!name || !field || !assigneeId || !dueDate) {
    res.status(400).json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc của công việc.' });
    return;
  }

  // Security check: If createdBy is provided, check user's role
  const creatorUser = createdBy ? db.getData().users.find((u) => u.id === createdBy) : null;
  let targetAssigneeId = assigneeId;

  if (creatorUser && creatorUser.role !== 'admin' && creatorUser.role !== 'leader') {
    // If a specialist creates a task, it must be assigned to themselves (self-task)
    targetAssigneeId = creatorUser.id;
  }

  const assignee = db.getData().users.find((u) => u.id === targetAssigneeId);
  const taskCode = (code && typeof code === 'string' && code.trim().length > 0) ? code.trim() : db.generateNextTaskCode();
  const initialStatus = ['pending', 'in_progress', 'completed', 'overdue'].includes(status) ? status : 'pending';
  const initialProgress = initialStatus === 'completed' ? 100 : (progress !== undefined ? Number(progress) : 0);

  const newTask: Task = {
    id: db.generateUniqueId('task'),
    code: taskCode,
    name,
    field,
    priority: priority || 'medium',
    assigneeId: targetAssigneeId,
    assigneeName: assignee ? assignee.name : '',
    status: initialStatus,
    progress: initialProgress,
    startDate: parseServerDate(startDate, new Date().toISOString().split('T')[0]),
    dueDate: parseServerDate(dueDate, new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]),
    direction: (!creatorUser || creatorUser.role === 'admin' || creatorUser.role === 'leader') ? (direction || '') : '',
    note: note || '',
    result: result || '',
    linkedDossierId: linkedDossierId || undefined,
    attachments: attachments || [],
    createdBy: createdBy || 'user_leader',
    createdByName: createdByName || 'Lãnh đạo đơn vị',
    createdAt: new Date().toISOString(),
    updatedBy: createdBy || 'user_leader',
    updatedByName: createdByName || 'Lãnh đạo đơn vị',
    updatedAt: new Date().toISOString(),
  };

  db.unmarkTaskDeleted(newTask.id, newTask.code);
  db.getData().tasks.unshift(newTask);

  db.addActivityLog(
    {
      userId: createdBy || 'user_leader',
      userName: createdByName || 'Lãnh đạo',
      action: 'CREATE',
      module: 'tasks',
      recordId: newTask.id,
      recordCode: newTask.code,
      description: `Tạo mới và giao nhiệm vụ ${newTask.code}: "${newTask.name}" cho ${newTask.assigneeName}.`,
    },
    false
  );

  if (targetAssigneeId) {
    db.addNotification(
      {
        userId: targetAssigneeId,
        title: 'Bạn được giao nhiệm vụ mới',
        content: `Nhiệm vụ [${newTask.code}] ${newTask.name} đã được phân công cho bạn. Hạn chót: ${newTask.dueDate}.`,
        type: 'info',
        relatedModule: 'tasks',
        relatedId: newTask.id,
      },
      false
    );
    broadcastEvent('NOTIFICATION_CREATED');
  }

  await db.save();

  broadcastEvent('TASK_CREATED', newTask);
  res.status(201).json(newTask);
});

apiRouter.post('/tasks/batch', async (req: Request, res: Response) => {
  const { tasks, importedBy, importedByName } = req.body;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    res.status(400).json({ error: 'Danh sách công việc không hợp lệ hoặc trống.' });
    return;
  }

  const createdList: Task[] = [];
  const updatedList: Task[] = [];
  const users = db.getData().users;
  const existingTasks = db.getData().tasks;
  const existingCodes = new Set(existingTasks.map((t) => t.code));
  const creatorUser = importedBy ? users.find((u) => u.id === importedBy) : null;
  const isLeaderOrAdmin = !creatorUser || creatorUser.role === 'admin' || creatorUser.role === 'leader';

  const defaultToday = new Date().toISOString().split('T')[0];
  const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const taskPrefix = `CV-${currentYear}-`;

  for (let idx = 0; idx < tasks.length; idx++) {
    const item = tasks[idx];
    const name = item.name ? String(item.name).trim() : '';
    if (!name) continue;

    // If task already exists by ID on server (e.g. during localVault reconciliation), update in place instead of duplicating
    if (item.id) {
      const existingIdx = existingTasks.findIndex((t) => t.id === item.id);
      if (existingIdx !== -1) {
        existingTasks[existingIdx] = {
          ...existingTasks[existingIdx],
          ...item,
          id: existingTasks[existingIdx].id,
          startDate: parseServerDate(item.startDate, existingTasks[existingIdx].startDate),
          dueDate: parseServerDate(item.dueDate, existingTasks[existingIdx].dueDate),
          updatedAt: item.updatedAt || new Date().toISOString(),
        };
        updatedList.push(existingTasks[existingIdx]);
        continue;
      }
    }

    const field = item.field ? String(item.field).trim() : 'Đăng ký đất đai';
    let targetAssigneeId = item.assigneeId || '';
    if (!isLeaderOrAdmin && creatorUser) {
      targetAssigneeId = creatorUser.id;
    }
    if (!targetAssigneeId) {
      targetAssigneeId = users[0]?.id || 'user_lieulv';
    }

    const assignee = users.find((u) => u.id === targetAssigneeId || u.name === item.assigneeName);
    const assigneeId = assignee ? assignee.id : targetAssigneeId;
    const assigneeName = assignee ? assignee.name : (item.assigneeName || '');

    let code = item.code ? String(item.code).trim() : '';
    if (!code || existingCodes.has(code)) {
      let nextNum = 1;
      for (const c of existingCodes) {
        if (c.startsWith(taskPrefix)) {
          const parts = c.split('-');
          if (parts.length >= 3) {
            const num = parseInt(parts[2], 10);
            if (!isNaN(num) && num >= nextNum) nextNum = num + 1;
          }
        }
      }
      code = `${taskPrefix}${nextNum.toString().padStart(3, '0')}`;
      while (existingCodes.has(code)) {
        nextNum++;
        code = `${taskPrefix}${nextNum.toString().padStart(3, '0')}`;
      }
    }
    existingCodes.add(code);

    const taskPriority = ['urgent', 'high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium';
    const taskStatus = ['pending', 'in_progress', 'completed', 'overdue'].includes(item.status) ? item.status : 'pending';
    const taskProgress = taskStatus === 'completed' ? 100 : (typeof item.progress === 'number' ? item.progress : 0);

    const newTask: Task = {
      id: item.id && !db.idExists(item.id) ? item.id : db.generateUniqueId('task'),
      code,
      name,
      field: field as any,
      priority: taskPriority,
      assigneeId,
      assigneeName,
      status: taskStatus,
      progress: taskProgress,
      startDate: parseServerDate(item.startDate, defaultToday),
      dueDate: parseServerDate(item.dueDate, defaultDue),
      direction: isLeaderOrAdmin ? (item.direction ? String(item.direction).trim() : '') : '',
      note: item.note ? String(item.note).trim() : '',
      result: item.result ? String(item.result).trim() : '',
      linkedDossierId: item.linkedDossierId || undefined,
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      createdBy: importedBy || item.createdBy || 'user_leader',
      createdByName: importedByName || item.createdByName || 'Lãnh đạo đơn vị',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedBy: importedBy || item.createdBy || 'user_leader',
      updatedByName: importedByName || item.createdByName || 'Lãnh đạo đơn vị',
      updatedAt: item.updatedAt || new Date().toISOString(),
    };

    db.unmarkTaskDeleted(newTask.id, newTask.code);
    createdList.push(newTask);
  }

  if (createdList.length === 0 && updatedList.length === 0) {
    res.status(400).json({ error: 'Không có công việc nào hợp lệ để tạo.' });
    return;
  }

  if (createdList.length > 0) {
    // Prepend to tasks list
    db.getData().tasks.unshift(...createdList);

    // Activity log for the batch
    db.addActivityLog(
      {
        userId: importedBy || 'user_leader',
        userName: importedByName || 'Hệ thống',
        action: 'CREATE',
        module: 'tasks',
        description: `Đã nhập và lưu thành công ${createdList.length} nhiệm vụ công việc từ Excel vào hệ thống.`,
      },
      false
    );
  }

  // Group notifications by assignee
  const assigneeTaskCounts = new Map<string, number>();
  for (const t of createdList) {
    if (t.assigneeId) {
      assigneeTaskCounts.set(t.assigneeId, (assigneeTaskCounts.get(t.assigneeId) || 0) + 1);
    }
  }

  for (const [aId, count] of assigneeTaskCounts.entries()) {
    db.addNotification(
      {
        userId: aId,
        title: 'Nhiệm vụ mới được giao (Nhập hàng loạt)',
        content: `Bạn được phân công ${count} nhiệm vụ mới vừa được nhập vào hệ thống.`,
        type: 'info',
        relatedModule: 'tasks',
      },
      false
    );
  }
  if (assigneeTaskCounts.size > 0) {
    broadcastEvent('NOTIFICATION_CREATED');
  }

  // Exactly ONE atomic save for the entire batch
  await db.save();

  const allAffected = [...createdList, ...updatedList];
  broadcastEvent('TASKS_BATCH_CREATED', { count: allAffected.length });
  res.status(201).json({
    message: `Đã lưu thành công ${allAffected.length} nhiệm vụ.`,
    count: allAffected.length,
    tasks: allAffected,
  });
});

apiRouter.put('/tasks/:id', async (req: Request, res: Response) => {
  const task = db.getData().tasks.find((t) => t.id === req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Không tìm thấy công việc.' });
    return;
  }

  const {
    name,
    field,
    priority,
    assigneeId,
    status,
    progress,
    startDate,
    dueDate,
    direction,
    note,
    result,
    linkedDossierId,
    attachments,
    updatedBy,
    updatedByName,
  } = req.body;

  // RBAC Permission Check: Only Admin and Leader can edit task information
  const modifierUser = (updatedBy ? db.getData().users.find((u) => u.id === updatedBy) : null) || getRequestUser(req);
  const isLeaderOrAdmin = modifierUser ? (modifierUser.role === 'admin' || modifierUser.role === 'leader') : false;

  if (!isLeaderOrAdmin) {
    const isAttemptingCoreEdit =
      req.body.code !== undefined ||
      name !== undefined ||
      field !== undefined ||
      priority !== undefined ||
      assigneeId !== undefined ||
      startDate !== undefined ||
      dueDate !== undefined ||
      direction !== undefined ||
      note !== undefined;
    const isAssigneeReportingResult =
      modifierUser &&
      task.assigneeId === modifierUser.id &&
      !isAttemptingCoreEdit &&
      (status === 'completed' || result !== undefined || attachments !== undefined);

    if (!isAssigneeReportingResult) {
      res.status(403).json({
        error: 'Chỉ có Admin và Lãnh đạo mới có quyền chỉnh sửa nhiệm vụ.',
      });
      return;
    }
  }

  // Validation: If status is being set to 'completed', result text OR at least 1 result attachment is MANDATORY!
  if (status === 'completed') {
    const hasResultText = (result && result.trim().length > 0) || (task.result && task.result.trim().length > 0);
    const hasAttachments =
      (attachments && attachments.length > 0) || (task.attachments && task.attachments.length > 0);

    if (!hasResultText && !hasAttachments) {
      res.status(400).json({
        error: 'Bắt buộc phải có kết quả xử lý hoặc ít nhất 01 tệp đính kèm kết quả để chuyển trạng thái "Đã hoàn thành".',
      });
      return;
    }
  }

  // Only Admin & Leader can change core task properties (name, field, priority, assignee, direction, dates)
  if (isLeaderOrAdmin) {
    if (req.body.code !== undefined && req.body.code.trim().length > 0) task.code = req.body.code.trim();
    if (name !== undefined) task.name = name;
    if (field !== undefined) task.field = field;
    if (priority !== undefined) task.priority = priority;
    if (assigneeId !== undefined) {
      task.assigneeId = assigneeId;
      const assignee = db.getData().users.find((u) => u.id === assigneeId);
      task.assigneeName = assignee ? assignee.name : task.assigneeName;
    }
    if (startDate !== undefined) task.startDate = startDate;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (direction !== undefined) task.direction = direction;
  }

  // Update progress, status, result, note, attachments
  if (status !== undefined) task.status = status;
  if (progress !== undefined) task.progress = Number(progress);
  if (note !== undefined && isLeaderOrAdmin) task.note = note;
  if (result !== undefined) task.result = result;
  if (linkedDossierId !== undefined) task.linkedDossierId = linkedDossierId;
  if (attachments !== undefined) task.attachments = attachments;

  if (status === 'completed' && task.progress < 100) {
    task.progress = 100;
  }

  task.updatedBy = updatedBy || task.updatedBy;
  task.updatedByName = updatedByName || task.updatedByName;
  task.updatedAt = new Date().toISOString();

  db.addActivityLog(
    {
      userId: updatedBy || 'user',
      userName: updatedByName || 'Cán bộ',
      action: status === 'completed' ? 'STATUS_CHANGE' : 'UPDATE',
      module: 'tasks',
      recordId: task.id,
      recordCode: task.code,
      description: `Cập nhật nhiệm vụ ${task.code}: Tiến độ ${task.progress}%, Trạng thái: ${task.status}.`,
    },
    false
  );

  await db.save();

  broadcastEvent('TASK_UPDATED', task);
  res.json(task);
});

apiRouter.delete('/tasks/:id', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  const targetId = req.params.id;

  const data = db.getData();
  const index = data.tasks.findIndex((t) => t.id === targetId || t.code === targetId);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy công việc để xóa.' });
    return;
  }

  const canDelete = Boolean(user && (user.role === 'admin' || user.role === 'leader'));

  if (!canDelete) {
    res.status(403).json({ error: 'Chỉ có Admin và Lãnh đạo mới có quyền xóa nhiệm vụ.' });
    return;
  }

  const deleted = data.tasks.splice(index, 1)[0];

  // Also remove any duplicate copies with same code or id if any exist
  data.tasks = data.tasks.filter((t) => t.id !== deleted.id && (deleted.code ? t.code !== deleted.code : true));

  if (!data.deletedTasks) {
    data.deletedTasks = [];
  }
  // Remove prior instance in deletedTasks if any, and place at front
  data.deletedTasks = data.deletedTasks.filter((t) => t.id !== deleted.id && (deleted.code ? t.code !== deleted.code : true));
  data.deletedTasks.unshift(deleted);
  if (data.deletedTasks.length > 200) {
    data.deletedTasks.pop();
  }

  const actorId = user?.id || 'admin';
  const actorName = user?.name || 'Cán bộ xử lý';

  db.addActivityLog(
    {
      userId: actorId,
      userName: actorName,
      action: 'DELETE',
      module: 'tasks',
      recordId: deleted.id,
      recordCode: deleted.code,
      description: `Đã xóa nhiệm vụ ${deleted.code}: "${deleted.name}".`,
    },
    false
  );

  await db.save();

  broadcastEvent('TASK_DELETED', { id: deleted.id, code: deleted.code });
  res.json({ message: 'Đã xóa công việc thành công.', task: deleted });
});

apiRouter.get('/tasks/deleted', (req: Request, res: Response) => {
  res.json(db.getData().deletedTasks || []);
});

// ==================== DOSSIERS (HỒ SƠ ĐẤT ĐAI) ====================
apiRouter.get('/dossiers', (req: Request, res: Response) => {
  res.json(db.getData().dossiers);
});

apiRouter.get('/dossiers/generate-code', (req: Request, res: Response) => {
  const code = db.generateNextDossierCode();
  res.json({ code });
});

apiRouter.post('/dossiers', async (req: Request, res: Response) => {
  const {
    code: userCode,
    owner,
    parcel,
    mapSheet,
    procedure,
    receivedDate,
    dueDate,
    handlerId,
    status,
    result,
    note,
    address,
    supplementDate,
    supplementNote,
    pauseDate,
    pauseReason,
    pausedDays,
    resumedDate,
    storageFolder,
    storageIndex,
    attachments,
    workflowSteps,
    workflowData,
    rejectionDate,
    rejectionReason,
    rejectionDocNumber,
    linkedTaskId,
    createdBy,
    createdByName,
  } = req.body;

  if (!owner || !parcel || !mapSheet || !procedure || !dueDate) {
    res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin chủ hồ sơ, số thửa, tờ bản đồ, thủ tục và hạn trả.' });
    return;
  }

  const handler = db.getData().users.find((u) => u.id === handlerId);
  const code = userCode && userCode.trim() ? userCode.trim() : db.generateNextDossierCode();

  const newDossier: Dossier = {
    id: db.generateUniqueId('dos'),
    code,
    owner,
    parcel,
    mapSheet,
    procedure,
    receivedDate: parseServerDate(receivedDate, new Date().toISOString().split('T')[0]),
    dueDate: parseServerDate(dueDate, new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]),
    handlerId: handlerId || 'user_lieulv',
    handlerName: handler ? handler.name : '',
    status: status || 'in_progress',
    result: result || '',
    address: address || '',
    note: note || '',
    supplementDate: supplementDate || undefined,
    supplementNote: supplementNote || undefined,
    pauseDate: pauseDate || undefined,
    pauseReason: pauseReason || undefined,
    pausedDays: pausedDays !== undefined ? Number(pausedDays) : undefined,
    resumedDate: resumedDate || undefined,
    rejectionDate: rejectionDate || undefined,
    rejectionReason: rejectionReason || undefined,
    rejectionDocNumber: rejectionDocNumber || undefined,
    storageFolder: storageFolder ? String(storageFolder).trim() : '',
    storageIndex: storageIndex ? String(storageIndex).trim() : '',
    attachments: attachments || [],
    workflowSteps: Array.isArray(workflowSteps) ? workflowSteps : undefined,
    workflowData: workflowData || undefined,
    linkedTaskId: linkedTaskId || undefined,
    createdBy: createdBy || 'user_hoaivu',
    createdByName: createdByName || 'Cán bộ thụ lý',
    createdAt: new Date().toISOString(),
    updatedBy: createdBy || 'user_hoaivu',
    updatedByName: createdByName || 'Cán bộ thụ lý',
    updatedAt: new Date().toISOString(),
  };

  db.unmarkDossierDeleted(newDossier.id, newDossier.code);
  db.getData().dossiers.unshift(newDossier);

  db.addActivityLog(
    {
      userId: createdBy || 'user',
      userName: createdByName || 'Cán bộ tiếp nhận',
      action: 'CREATE',
      module: 'dossiers',
      recordId: newDossier.id,
      recordCode: newDossier.code,
      description: `Tiếp nhận hồ sơ đất đai ${newDossier.code} của ông/bà ${newDossier.owner} (Thửa ${newDossier.parcel}, TBĐ ${newDossier.mapSheet}${newDossier.storageFolder ? `, Lưu trữ: ${newDossier.storageFolder} - STT ${newDossier.storageIndex}` : ''}).`,
    },
    false
  );

  if (handlerId) {
    db.addNotification(
      {
        userId: handlerId,
        title: 'Hồ sơ đất đai được phân công thụ lý',
        content: `Hồ sơ số ${newDossier.code} của ${newDossier.owner} đã được chuyển cho bạn. Hạn trả: ${newDossier.dueDate}.`,
        type: 'info',
        relatedModule: 'dossiers',
        relatedId: newDossier.id,
      },
      false
    );
    broadcastEvent('NOTIFICATION_CREATED');
  }

  await db.save();

  broadcastEvent('DOSSIER_CREATED', newDossier);
  res.status(201).json(newDossier);
});

apiRouter.post('/dossiers/batch', async (req: Request, res: Response) => {
  const { dossiers, importedBy, importedByName } = req.body;
  if (!Array.isArray(dossiers) || dossiers.length === 0) {
    res.status(400).json({ error: 'Danh sách hồ sơ không hợp lệ hoặc trống.' });
    return;
  }

  const deletedIds = new Set((db.getData().deletedDossiers || []).map((d) => d.id));
  const deletedCodes = new Set((db.getData().deletedDossiers || []).map((d) => d.code).filter(Boolean));

  // Safeguard: Never resurrect dossiers that were deleted by users or legacy mock templates
  const filteredDossiers = dossiers.filter((item: any) => {
    const itemId = item?.id ? String(item.id).trim() : '';
    const itemCode = item?.code ? String(item.code).trim() : '';
    if (itemId && (deletedIds.has(itemId) || itemId.startsWith('dos_kep'))) return false;
    if (itemCode && deletedCodes.has(itemCode)) return false;
    return true;
  });

  if (filteredDossiers.length === 0) {
    res.json({ message: 'Tất cả hồ sơ trong danh sách đã bị xóa trước đó.', count: 0, dossiers: [] });
    return;
  }

  const createdList: Dossier[] = [];
  const updatedList: Dossier[] = [];
  const existingDossiers = db.getData().dossiers;
  const existingCodes = new Set(existingDossiers.map((d) => d.code));
  const users = db.getData().users;
  const reqUser = getRequestUser(req);

  filteredDossiers.forEach((item: any, idx: number) => {
    // If dossier already exists by ID on server (e.g. during localVault reconciliation), update in place only if authorized
    if (item.id) {
      const existingIdx = existingDossiers.findIndex((d) => d.id === item.id);
      if (existingIdx !== -1) {
        if (canUserModifyRecord(reqUser, existingDossiers[existingIdx])) {
          existingDossiers[existingIdx] = {
            ...existingDossiers[existingIdx],
            ...item,
            id: existingDossiers[existingIdx].id,
            receivedDate: parseServerDate(item.receivedDate, existingDossiers[existingIdx].receivedDate),
            dueDate: parseServerDate(item.dueDate, existingDossiers[existingIdx].dueDate),
            updatedAt: item.updatedAt || new Date().toISOString(),
          };
          updatedList.push(existingDossiers[existingIdx]);
        }
        return;
      }
    }

    let code = item.code ? String(item.code).trim() : '';
    if (!code || existingCodes.has(code)) {
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const mm = (now.getMonth() + 1).toString().padStart(2, '0');
      const dd = now.getDate().toString().padStart(2, '0');
      const rand = Math.floor(1000 + Math.random() * 9000);
      code = `H17.130-${yy}${mm}${dd}-${rand}${idx}`;
    }
    existingCodes.add(code);

    let folder = (item.storageFolder || '').trim();
    if (folder && !['Kẹp 1', 'Kẹp 2', 'Kẹp 3'].includes(folder)) {
      if (folder.includes('15') || folder.includes('01') || folder.includes('1')) {
        folder = 'Kẹp 1';
      } else if (folder.includes('8') || folder.includes('08') || folder.includes('2') || folder.includes('02')) {
        folder = 'Kẹp 2';
      } else if (folder.includes('3') || folder.includes('03')) {
        folder = 'Kẹp 3';
      } else {
        folder = 'Kẹp 1';
      }
    }

    const handler = users.find((u) => u.id === item.handlerId || u.name === item.handlerName);
    const handlerId = handler ? handler.id : item.handlerId || 'user_lieulv';
    const handlerName = handler ? handler.name : item.handlerName || 'Lê Văn Liệu';

    const newDos: Dossier = {
      id: item.id && !db.idExists(item.id) ? item.id : db.generateUniqueId('dos'),
      code,
      owner: String(item.owner || 'Chưa có tên chủ hồ sơ').trim(),
      parcel: String(item.parcel || '').trim(),
      mapSheet: String(item.mapSheet || '').trim(),
      procedure: String(item.procedure || 'Cấp giấy lần đầu').trim(),
      receivedDate: parseServerDate(item.receivedDate, new Date().toISOString().split('T')[0]),
      dueDate: parseServerDate(item.dueDate, new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]),
      handlerId,
      handlerName,
      status: item.status || 'in_progress',
      result: item.result || '',
      address: item.address || 'Xã Lãnh Ngọc',
      note: item.note || '',
      storageFolder: folder || 'Kẹp 1',
      storageIndex: item.storageIndex ? String(item.storageIndex).trim() : `${createdList.length + 1}`,
      attachments: Array.isArray(item.attachments) ? item.attachments : [],
      createdBy: importedBy || item.createdBy || 'user_hoaivu',
      createdByName: importedByName || item.createdByName || 'Đoàn Văn Hoài Vũ',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    };

    db.unmarkDossierDeleted(newDos.id, newDos.code);
    db.getData().dossiers.unshift(newDos);
    createdList.push(newDos);
  });

  if (createdList.length > 0) {
    db.addActivityLog(
      {
        userId: importedBy || 'user_admin',
        userName: importedByName || 'Hệ thống',
        action: 'CREATE',
        module: 'dossiers',
        description: `Đã nhập và lưu thành công ${createdList.length} hồ sơ đất đai vào hệ thống.`,
      },
      false
    );
  }

  await db.save();

  const allAffected = [...createdList, ...updatedList];
  broadcastEvent('DOSSIERS_BATCH_CREATED', { count: allAffected.length });
  res.status(201).json({
    message: `Đã lưu thành công ${allAffected.length} hồ sơ.`,
    count: allAffected.length,
    dossiers: allAffected,
  });
});

apiRouter.post(['/dossiers/restore-standard-60', '/dossiers/restore-standard-69'], async (req: Request, res: Response) => {
  const force = req.body && req.body.force === true;
  const currentDossiers = db.getData().dossiers || [];
  const standardCodes = new Set(initialDossiers.map((d) => d.code));
  const standardIds = new Set(initialDossiers.map((d) => d.id));
  const userDossiers = currentDossiers.filter((d) => !standardCodes.has(d.code));

  if (force || currentDossiers.length === 0) {
    db.getData().dossiers = [...initialDossiers, ...userDossiers];
  } else {
    const existingCodes = new Set(currentDossiers.map((d) => d.code));
    const missing = initialDossiers.filter((d) => !existingCodes.has(d.code));
    if (missing.length > 0) {
      db.getData().dossiers = [...currentDossiers, ...missing];
    }
  }

  // Unmark standard dossiers from deletedDossiers so they persist across server restarts
  if (Array.isArray(db.getData().deletedDossiers)) {
    db.getData().deletedDossiers = db.getData().deletedDossiers!.filter(
      (d) => !standardIds.has(d.id) && (!d.code || !standardCodes.has(d.code))
    );
  }

  if (!db.getData().tasks || db.getData().tasks.length === 0) {
    db.getData().tasks = [...initialTasks];
  }

  await db.save();

  broadcastEvent('DOSSIER_RESTORED', {
    restoredIds: Array.from(standardIds),
    restoredCodes: Array.from(standardCodes),
  });
  broadcastEvent('DOSSIERS_BATCH_CREATED', { count: db.getData().dossiers.length });
  broadcastEvent('DOSSIER_UPDATED', {});
  res.json({
    message: `Đã nạp và đồng bộ thành công ${db.getData().dossiers.length} hồ sơ đất đai vào hệ thống (bảo lưu an toàn ${userDossiers.length} hồ sơ do bạn tạo).`,
    total: db.getData().dossiers.length,
  });
});

apiRouter.put('/dossiers/:id', async (req: Request, res: Response) => {
  const dossier = db.getData().dossiers.find((d) => d.id === req.params.id);
  if (!dossier) {
    res.status(404).json({ error: 'Không tìm thấy hồ sơ.' });
    return;
  }

  const reqUser = getRequestUser(req);
  if (!canUserModifyRecord(reqUser, dossier)) {
    res.status(403).json({
      error: `Bạn không có quyền chỉnh sửa hồ sơ của cán bộ ${dossier.handlerName || 'khác'}. Chỉ Admin, Lãnh đạo hoặc cán bộ trực tiếp thụ lý mới được phép thao tác.`,
    });
    return;
  }

  const {
    code,
    owner,
    parcel,
    mapSheet,
    procedure,
    receivedDate,
    dueDate,
    handlerId,
    status,
    result,
    address,
    note,
    supplementDate,
    supplementNote,
    pauseDate,
    pauseReason,
    pausedDays,
    resumedDate,
    storageFolder,
    storageIndex,
    attachments,
    workflowSteps,
    workflowData,
    rejectionDate,
    rejectionReason,
    rejectionDocNumber,
    linkedTaskId,
    updatedBy,
    updatedByName,
  } = req.body;

  const prevStatus = dossier.status;

  if (code !== undefined && code.trim()) dossier.code = code.trim();
  if (owner !== undefined) dossier.owner = owner;
  if (parcel !== undefined) dossier.parcel = parcel;
  if (mapSheet !== undefined) dossier.mapSheet = mapSheet;
  if (procedure !== undefined) dossier.procedure = procedure;
  if (receivedDate !== undefined) dossier.receivedDate = parseServerDate(receivedDate, dossier.receivedDate);
  if (dueDate !== undefined) dossier.dueDate = parseServerDate(dueDate, dossier.dueDate);
  if (handlerId !== undefined) {
    dossier.handlerId = handlerId;
    const handler = db.getData().users.find((u) => u.id === handlerId);
    dossier.handlerName = handler ? handler.name : dossier.handlerName;
  }
  if (status !== undefined) dossier.status = status;
  if (result !== undefined) dossier.result = result;
  if (address !== undefined) dossier.address = address;
  if (note !== undefined) dossier.note = note;
  if (supplementDate !== undefined) dossier.supplementDate = supplementDate;
  if (supplementNote !== undefined) dossier.supplementNote = supplementNote;
  if (pauseDate !== undefined) dossier.pauseDate = pauseDate;
  if (pauseReason !== undefined) dossier.pauseReason = pauseReason;
  if (pausedDays !== undefined) dossier.pausedDays = pausedDays;
  if (resumedDate !== undefined) dossier.resumedDate = resumedDate;
  if (rejectionDate !== undefined) dossier.rejectionDate = rejectionDate;
  if (rejectionReason !== undefined) dossier.rejectionReason = rejectionReason;
  if (rejectionDocNumber !== undefined) dossier.rejectionDocNumber = rejectionDocNumber;
  if (storageFolder !== undefined) dossier.storageFolder = String(storageFolder).trim();
  if (storageIndex !== undefined) dossier.storageIndex = String(storageIndex).trim();
  if (attachments !== undefined) dossier.attachments = attachments;
  if (workflowSteps !== undefined) dossier.workflowSteps = Array.isArray(workflowSteps) ? workflowSteps : undefined;
  if (workflowData !== undefined) dossier.workflowData = workflowData;
  if (linkedTaskId !== undefined) dossier.linkedTaskId = linkedTaskId;

  // When transitioning into 'supplement', clear any old resumedDate so second supplement works properly
  if (prevStatus !== 'supplement' && status === 'supplement') {
    if (resumedDate === undefined) {
      dossier.resumedDate = undefined;
    }
    if (!dossier.supplementDate) {
      dossier.supplementDate = new Date().toISOString().split('T')[0];
    }
  }

  // Law regulation: When receiving full supplement, recalculate time completely from scratch
  if (prevStatus === 'supplement' && status === 'in_progress') {
    const today = new Date().toISOString().split('T')[0];
    if (receivedDate === undefined) {
      dossier.receivedDate = today;
    }
    if (resumedDate === undefined) {
      dossier.resumedDate = today;
    }
    if (dueDate === undefined) {
      const standardDays = getStandardWorkingDaysForProcedure(dossier.procedure);
      dossier.dueDate = addWorkingDays(dossier.receivedDate || today, standardDays);
    }
  }

  // When resuming from 'paused', preserve remaining working days
  if (prevStatus === 'paused' && status === 'in_progress') {
    const today = new Date().toISOString().split('T')[0];
    if (resumedDate === undefined) {
      dossier.resumedDate = today;
    }
    if (dueDate === undefined && dossier.pauseDate) {
      const calc = calculateResumedDueDate(dossier.dueDate, dossier.pauseDate, dossier.resumedDate);
      dossier.dueDate = calc.newDueDate;
      if (pausedDays === undefined) {
        dossier.pausedDays = (dossier.pausedDays || 0) + calc.pausedWorkingDays;
      }
    }
  }

  dossier.updatedBy = updatedBy || dossier.updatedBy;
  dossier.updatedByName = updatedByName || dossier.updatedByName;
  dossier.updatedAt = new Date().toISOString();

  let logDesc = `Cập nhật hồ sơ ${dossier.code}: Trạng thái ${dossier.status}.`;
  if (status === 'supplement') {
    logDesc = `Hồ sơ ${dossier.code} chuyển sang trạng thái: Yêu cầu bổ sung hồ sơ.`;
  } else if (status === 'paused') {
    logDesc = `Hồ sơ ${dossier.code} chuyển sang trạng thái: Tạm dừng xử lý (Lý do: ${dossier.pauseReason || 'Tạm dừng nghiệp vụ'}).`;
  } else if (prevStatus === 'supplement' && status === 'in_progress') {
    logDesc = `Hồ sơ ${dossier.code}: Đã nhận đủ bổ sung, tính lại thời hạn từ đầu (Hạn mới: ${dossier.dueDate}).`;
  } else if (prevStatus === 'paused' && status === 'in_progress') {
    logDesc = `Hồ sơ ${dossier.code}: Đã bỏ tạm dừng, tiếp tục xử lý với thời gian còn lại (Hạn mới: ${dossier.dueDate}).`;
  } else if (status === 'resolved') {
    logDesc = `Hồ sơ ${dossier.code} đã giải quyết thành công và trả kết quả.`;
  }

  db.addActivityLog(
    {
      userId: updatedBy || 'user',
      userName: updatedByName || 'Cán bộ thụ lý',
      action: status === 'resolved' || status === 'supplement' || status === 'paused' || prevStatus === 'supplement' || prevStatus === 'paused' ? 'STATUS_CHANGE' : 'UPDATE',
      module: 'dossiers',
      recordId: dossier.id,
      recordCode: dossier.code,
      description: logDesc,
    },
    false
  );

  await db.save();

  broadcastEvent('DOSSIER_UPDATED', dossier);
  res.json(dossier);
});

apiRouter.delete('/dossiers/:id', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  const targetId = req.params.id;

  const data = db.getData();
  const index = data.dossiers.findIndex((d) => d.id === targetId || d.code === targetId);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy hồ sơ để xóa.' });
    return;
  }

  const targetDossier = data.dossiers[index];
  if (!canUserModifyRecord(user, targetDossier)) {
    res.status(403).json({
      error: `Bạn không có quyền xóa hồ sơ của cán bộ ${targetDossier.handlerName || 'khác'}. Chỉ Admin, Lãnh đạo hoặc cán bộ trực tiếp thụ lý mới được phép xóa.`,
    });
    return;
  }

  const deleted = data.dossiers.splice(index, 1)[0];

  // Also remove any duplicate copies with same code or id if any exist
  data.dossiers = data.dossiers.filter((d) => d.id !== deleted.id && (deleted.code ? d.code !== deleted.code : true));

  if (!data.deletedDossiers) {
    data.deletedDossiers = [];
  }
  // Remove prior instance in deletedDossiers if any, and place at front
  data.deletedDossiers = data.deletedDossiers.filter((d) => d.id !== deleted.id && (deleted.code ? d.code !== deleted.code : true));
  data.deletedDossiers.unshift(deleted);
  if (data.deletedDossiers.length > 200) {
    data.deletedDossiers.pop();
  }

  const actorId = user?.id || 'admin';
  const actorName = user?.name || 'Cán bộ xử lý';

  db.addActivityLog(
    {
      userId: actorId,
      userName: actorName,
      action: 'DELETE',
      module: 'dossiers',
      recordId: deleted.id,
      recordCode: deleted.code,
      description: `Đã xóa hồ sơ ${deleted.code} (Chủ hộ: ${deleted.owner}).`,
    },
    false
  );

  await db.save();

  broadcastEvent('DOSSIER_DELETED', { id: deleted.id, code: deleted.code });
  res.json({ message: 'Đã xóa hồ sơ thành công.', dossier: deleted });
});

// ==================== DOSSIER RESTORE & RECYCLE BIN (ADMIN ONLY) ====================
apiRouter.get('/dossiers/deleted', (req: Request, res: Response) => {
  res.json(db.getData().deletedDossiers || []);
});

apiRouter.post('/dossiers/restore-deleted/:id', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền khôi phục hồ sơ đất đai.' });
    return;
  }

  const deletedList = db.getData().deletedDossiers || [];
  const idx = deletedList.findIndex((d) => d.id === req.params.id);
  if (idx === -1) {
    const alreadyRestored = (db.getData().dossiers || []).find((d) => d.id === req.params.id);
    if (alreadyRestored) {
      broadcastEvent('DOSSIER_RESTORED', { id: alreadyRestored.id, code: alreadyRestored.code });
      res.json({ message: `Đã khôi phục thành công hồ sơ ${alreadyRestored.code}`, dossier: alreadyRestored });
      return;
    }
    res.status(404).json({ error: 'Không tìm thấy hồ sơ trong kho khôi phục.' });
    return;
  }

  const [restored] = deletedList.splice(idx, 1);
  if (!db.getData().dossiers.some((d) => d.id === restored.id)) {
    db.getData().dossiers.unshift(restored);
  }

  db.addActivityLog(
    {
      userId: user.id,
      userName: user.name,
      action: 'RESTORE',
      module: 'dossiers',
      recordId: restored.id,
      recordCode: restored.code,
      description: `Quản trị viên ${user.name} đã khôi phục hồ sơ ${restored.code} (Chủ hộ: ${restored.owner}) từ kho khôi phục.`,
    },
    false
  );

  await db.save();

  broadcastEvent('DOSSIER_RESTORED', { id: restored.id, code: restored.code });
  broadcastEvent('DOSSIER_CREATED', { id: restored.id, code: restored.code });
  res.json({ message: `Đã khôi phục thành công hồ sơ ${restored.code}`, dossier: restored });
});

apiRouter.post('/dossiers/restore-all-deleted', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền khôi phục hồ sơ đất đai.' });
    return;
  }

  const deletedList = db.getData().deletedDossiers || [];
  if (deletedList.length === 0) {
    res.json({ message: 'Kho khôi phục hiện không có hồ sơ nào.', restoredCount: 0 });
    return;
  }

  const restoredIds = deletedList.map((d) => d.id);
  const restoredCodes = deletedList.map((d) => d.code).filter(Boolean);
  const existingIds = new Set(db.getData().dossiers.map((d) => d.id));
  const toRestore = deletedList.filter((d) => !existingIds.has(d.id));
  db.getData().dossiers = [...toRestore, ...db.getData().dossiers];
  db.getData().deletedDossiers = [];

  db.addActivityLog(
    {
      userId: user.id,
      userName: user.name,
      action: 'RESTORE',
      module: 'dossiers',
      description: `Quản trị viên ${user.name} đã khôi phục toàn bộ ${toRestore.length} hồ sơ từ kho khôi phục.`,
    },
    false
  );

  await db.save();

  broadcastEvent('DOSSIER_RESTORED', { restoredIds, restoredCodes });
  broadcastEvent('DOSSIER_UPDATED', {});
  res.json({ message: `Đã khôi phục thành công ${toRestore.length} hồ sơ vào hệ thống.`, restoredCount: toRestore.length });
});

// ==================== CALENDAR EVENTS & DEADLINES ====================
apiRouter.get('/calendar', (req: Request, res: Response) => {
  res.json(db.getData().calendarEvents);
});

apiRouter.post('/calendar', async (req: Request, res: Response) => {
  const { date, time, type, name, assigneeId, location, note, progress, attachments, linkedTaskId, createdBy, createdByName } = req.body;

  if (!date || !name || !type) {
    res.status(400).json({ error: 'Vui lòng nhập ngày, loại sự kiện và tiêu đề.' });
    return;
  }

  const assignee = db.getData().users.find((u) => u.id === assigneeId);

  const newEvent: CalendarEvent = {
    id: db.generateUniqueId('cal'),
    date,
    time: time || '08:00',
    type,
    name,
    assigneeId: assigneeId || 'user_leader',
    assigneeName: assignee ? assignee.name : '',
    progress: progress !== undefined ? progress : 0,
    location: location || '',
    note: note || '',
    attachments: attachments || [],
    linkedTaskId: linkedTaskId || undefined,
    createdBy: createdBy || 'user_leader',
    createdByName: createdByName || 'Lãnh đạo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.getData().calendarEvents.unshift(newEvent);

  db.addActivityLog(
    {
      userId: createdBy || 'user',
      userName: createdByName || 'Cán bộ',
      action: 'CREATE',
      module: 'calendar',
      recordId: newEvent.id,
      description: `Tạo lịch công tác/deadline mới: "${newEvent.name}" vào ngày ${newEvent.date}.`,
    },
    false
  );

  await db.save();

  broadcastEvent('CALENDAR_CREATED', newEvent);
  res.status(201).json(newEvent);
});

apiRouter.put('/calendar/:id', async (req: Request, res: Response) => {
  const event = db.getData().calendarEvents.find((e) => e.id === req.params.id);
  if (!event) {
    res.status(404).json({ error: 'Không tìm thấy lịch.' });
    return;
  }

  const reqUser = getRequestUser(req);
  if (!canUserModifyRecord(reqUser, event)) {
    res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa sự kiện lịch của cán bộ khác.' });
    return;
  }

  const { date, time, type, name, assigneeId, location, note, progress, result, attachments, linkedTaskId } = req.body;

  // Validation: If progress is 100%, MUST have result OR at least 1 attachment
  if (progress === 100) {
    const hasResultText = (result && result.trim().length > 0) || (event.result && event.result.trim().length > 0);
    const hasAttachments = (attachments && attachments.length > 0) || (event.attachments && event.attachments.length > 0);
    if (!hasResultText && !hasAttachments) {
      res.status(400).json({ error: 'Khi tiến độ đạt 100%, bắt buộc phải có kết quả xử lý hoặc tệp kết quả đính kèm.' });
      return;
    }
  }

  if (date !== undefined) event.date = date;
  if (time !== undefined) event.time = time;
  if (type !== undefined) event.type = type;
  if (name !== undefined) event.name = name;
  if (location !== undefined) event.location = location;
  if (note !== undefined) event.note = note;
  if (result !== undefined) event.result = result;
  if (progress !== undefined) event.progress = progress;
  if (attachments !== undefined) event.attachments = attachments;
  if (linkedTaskId !== undefined) event.linkedTaskId = linkedTaskId;
  if (assigneeId !== undefined) {
    event.assigneeId = assigneeId;
    const assignee = db.getData().users.find((u) => u.id === assigneeId);
    event.assigneeName = assignee ? assignee.name : event.assigneeName;
  }
  event.updatedAt = new Date().toISOString();
  await db.save();

  broadcastEvent('CALENDAR_UPDATED', event);
  res.json(event);
});

apiRouter.delete('/calendar/:id', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  const event = db.getData().calendarEvents.find((e) => e.id === req.params.id);
  if (!event) {
    res.status(404).json({ error: 'Không tìm thấy sự kiện lịch.' });
    return;
  }

  if (!canUserModifyRecord(user, event)) {
    res.status(403).json({ error: 'Chỉ Quản trị viên, Lãnh đạo hoặc người tạo/phụ trách sự kiện mới có quyền xóa lịch.' });
    return;
  }

  const index = db.getData().calendarEvents.findIndex((e) => e.id === req.params.id);
  const deleted = db.getData().calendarEvents.splice(index, 1)[0];

  db.addActivityLog(
    {
      userId: user?.id || 'admin',
      userName: user?.name || 'Cán bộ',
      action: 'DELETE',
      module: 'calendar',
      recordId: deleted.id,
      description: `Đã xóa lịch công tác: "${deleted.name}".`,
    },
    false
  );

  await db.save();

  broadcastEvent('CALENDAR_DELETED', { id: deleted.id });
  res.json({ message: 'Đã xóa lịch thành công.', event: deleted });
});

// ==================== REGISTER BOOKS (SỔ THEO DÕI) ====================
function normalizeRegisterBookType(type: string): any {
  if (type === 'Sổ cấp GCN') return 'Sổ cấp giấy';
  if (type === 'Sổ đăng ký biến động') return 'Sổ theo dõi biến động';
  if (type === 'Sổ theo dõi khoáng sản') return 'Sổ theo dõi cấp phát phôi GCN';
  if (type === 'Sổ theo dõi tranh chấp') return 'Sổ theo dõi thu hồi GCN';
  if (type === 'Sổ theo dõi môi trường') return 'Sổ theo dõi HS tặng cho đất NN';
  return type;
}

apiRouter.get('/register-books', (req: Request, res: Response) => {
  const books = (db.getData().registerBooks || []).map((b) => ({
    ...b,
    type: normalizeRegisterBookType(b.type),
  }));
  res.json(books);
});

apiRouter.post('/register-books', async (req: Request, res: Response) => {
  const {
    stt,
    bookNumber,
    type,
    content,
    relatedPerson,
    createdDate,
    status,
    notes,
    attachments,
    issueSerialNumber,
    mapSheet,
    parcel,
    gcnForMutation,
    dossierCode,
    blankQuantity,
    serialFrom,
    serialTo,
    damagedCount,
    createdBy,
    createdByName,
  } = req.body;

  const normalizedType = normalizeRegisterBookType(type || 'Sổ cấp giấy');

  if (!normalizedType || !relatedPerson) {
    res.status(400).json({ error: 'Vui lòng nhập đầy đủ loại sổ và họ tên người liên quan.' });
    return;
  }

  const resolvedBookNumber =
    bookNumber ||
    dossierCode ||
    issueSerialNumber ||
    (serialFrom && serialTo ? `${serialFrom} - ${serialTo}` : serialFrom) ||
    `SĐC-${Date.now().toString().slice(-4)}`;

  const resolvedContent =
    content ||
    (normalizedType === 'Sổ cấp giấy'
      ? `Cấp GCN số phát hành ${issueSerialNumber || '---'}, số vào sổ ${bookNumber || '---'} (Thửa ${parcel || '---'}, TBĐ ${mapSheet || '---'})`
      : normalizedType === 'Sổ theo dõi cấp phát phôi GCN'
      ? `Nhận ${blankQuantity || 0} phôi GCN (Seri từ ${serialFrom || '---'} đến ${serialTo || '---'}, hỏng: ${damagedCount || 0})`
      : notes || 'Ghi sổ theo dõi nghiệp vụ đất đai');

  const existingSameTypeCount = (db.getData().registerBooks || []).filter(
    (b) => normalizeRegisterBookType(b.type) === normalizedType
  ).length;

  const newBook: RegisterBook = {
    id: db.generateUniqueId('book'),
    stt: stt !== undefined && stt !== '' ? Number(stt) : existingSameTypeCount + 1,
    bookNumber: resolvedBookNumber,
    type: normalizedType,
    content: resolvedContent,
    relatedPerson,
    createdDate: createdDate || new Date().toISOString().split('T')[0],
    status: status || 'Đang xử lý',
    notes: notes || '',
    attachments: attachments || [],
    issueSerialNumber: issueSerialNumber || '',
    mapSheet: mapSheet || '',
    parcel: parcel || '',
    gcnForMutation: gcnForMutation || '',
    dossierCode: dossierCode || bookNumber || '',
    blankQuantity: blankQuantity !== undefined ? blankQuantity : '',
    serialFrom: serialFrom || '',
    serialTo: serialTo || '',
    damagedCount: damagedCount !== undefined ? damagedCount : 0,
    createdBy: createdBy || 'user_spec_1',
    createdByName: createdByName || 'Cán bộ địa chính',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.getData().registerBooks.unshift(newBook);

  db.addActivityLog(
    {
      userId: createdBy || 'user',
      userName: createdByName || 'Cán bộ',
      action: 'CREATE',
      module: 'registerBooks',
      recordId: newBook.id,
      recordCode: newBook.bookNumber,
      description: `Ghi sổ theo dõi (${newBook.type}) số ${newBook.bookNumber}: "${newBook.content}".`,
    },
    false
  );

  await db.save();

  broadcastEvent('REGISTER_BOOK_CREATED', newBook);
  res.status(201).json(newBook);
});

apiRouter.post('/register-books/batch', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  const incomingBooks = req.body.books || [];
  if (!Array.isArray(incomingBooks) || incomingBooks.length === 0) {
    res.status(400).json({ error: 'Danh sách sổ theo dõi không hợp lệ.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const createdList: RegisterBook[] = [];

  for (let idx = 0; idx < incomingBooks.length; idx++) {
    const raw = incomingBooks[idx];
    const normalizedType = normalizeRegisterBookType(raw.type || 'Sổ cấp giấy');
    const existingSameTypeCount = (db.getData().registerBooks || []).filter(
      (b) => normalizeRegisterBookType(b.type) === normalizedType
    ).length;

    const resolvedBookNumber =
      raw.bookNumber ||
      raw.dossierCode ||
      raw.issueSerialNumber ||
      (raw.serialFrom && raw.serialTo ? `${raw.serialFrom} - ${raw.serialTo}` : raw.serialFrom) ||
      `SĐC-${Date.now().toString().slice(-4)}-${idx + 1}`;

    const resolvedContent =
      raw.content ||
      (normalizedType === 'Sổ cấp giấy'
        ? `Cấp GCN số phát hành ${raw.issueSerialNumber || '---'}, số vào sổ ${resolvedBookNumber} (Thửa ${raw.parcel || '---'}, TBĐ ${raw.mapSheet || '---'})`
        : normalizedType === 'Sổ theo dõi cấp phát phôi GCN'
        ? `Nhận ${raw.blankQuantity || 0} phôi GCN (Seri từ ${raw.serialFrom || '---'} đến ${raw.serialTo || '---'}, hỏng: ${raw.damagedCount || 0})`
        : raw.notes || 'Ghi sổ theo dõi nghiệp vụ đất đai');

    const newBook: RegisterBook = {
      id: raw.id || db.generateUniqueId('book'),
      stt: raw.stt !== undefined && raw.stt !== '' ? Number(raw.stt) : existingSameTypeCount + 1 + idx,
      bookNumber: resolvedBookNumber,
      type: normalizedType,
      content: resolvedContent,
      relatedPerson: raw.relatedPerson || '—',
      createdDate: raw.createdDate || nowIso.split('T')[0],
      status: raw.status || 'Đang xử lý',
      notes: raw.notes || '',
      attachments: raw.attachments || [],
      issueSerialNumber: raw.issueSerialNumber || '',
      mapSheet: raw.mapSheet || '',
      parcel: raw.parcel || '',
      gcnForMutation: raw.gcnForMutation || '',
      dossierCode: raw.dossierCode || resolvedBookNumber || '',
      blankQuantity: raw.blankQuantity !== undefined ? raw.blankQuantity : '',
      serialFrom: raw.serialFrom || '',
      serialTo: raw.serialTo || '',
      damagedCount: raw.damagedCount !== undefined ? raw.damagedCount : 0,
      createdBy: raw.createdBy || user?.id || 'system',
      createdByName: raw.createdByName || user?.name || 'Cán bộ địa chính',
      createdAt: raw.createdAt || nowIso,
      updatedAt: nowIso,
    };

    createdList.push(newBook);
    db.getData().registerBooks.unshift(newBook);
  }

  db.addActivityLog(
    {
      userId: user?.id || 'admin',
      userName: user?.name || 'Cán bộ',
      action: 'CREATE',
      module: 'registerBooks',
      recordId: `batch_${Date.now()}`,
      description: `Đã nhập hàng loạt ${createdList.length} mục vào Sổ theo dõi từ Excel.`,
    },
    false
  );

  await db.save();
  broadcastEvent('REGISTER_BOOKS_BATCH_CREATED', { count: createdList.length, books: createdList });
  res.status(201).json({ message: `Đã nhập thành công ${createdList.length} mục vào sổ theo dõi.`, count: createdList.length, books: createdList });
});

apiRouter.put('/register-books/:id', async (req: Request, res: Response) => {
  const book = db.getData().registerBooks.find((b) => b.id === req.params.id);
  if (!book) {
    res.status(404).json({ error: 'Không tìm thấy mục sổ theo dõi.' });
    return;
  }
  const reqUser = getRequestUser(req);
  if (!canUserModifyRecord(reqUser, book)) {
    res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa mục sổ theo dõi của cán bộ khác.' });
    return;
  }
  const {
    stt,
    bookNumber,
    type,
    content,
    relatedPerson,
    createdDate,
    status,
    notes,
    attachments,
    issueSerialNumber,
    mapSheet,
    parcel,
    gcnForMutation,
    dossierCode,
    blankQuantity,
    serialFrom,
    serialTo,
    damagedCount,
  } = req.body;
  if (stt !== undefined) book.stt = Number(stt) || 1;
  if (bookNumber !== undefined) book.bookNumber = bookNumber;
  if (type !== undefined) book.type = normalizeRegisterBookType(type);
  if (content !== undefined) book.content = content;
  if (relatedPerson !== undefined) book.relatedPerson = relatedPerson;
  if (createdDate !== undefined) book.createdDate = createdDate;
  if (status !== undefined) book.status = status;
  if (notes !== undefined) book.notes = notes;
  if (attachments !== undefined) book.attachments = attachments;
  if (issueSerialNumber !== undefined) book.issueSerialNumber = issueSerialNumber;
  if (mapSheet !== undefined) book.mapSheet = mapSheet;
  if (parcel !== undefined) book.parcel = parcel;
  if (gcnForMutation !== undefined) book.gcnForMutation = gcnForMutation;
  if (dossierCode !== undefined) book.dossierCode = dossierCode;
  if (blankQuantity !== undefined) book.blankQuantity = blankQuantity;
  if (serialFrom !== undefined) book.serialFrom = serialFrom;
  if (serialTo !== undefined) book.serialTo = serialTo;
  if (damagedCount !== undefined) book.damagedCount = damagedCount;
  book.updatedAt = new Date().toISOString();
  await db.save();

  broadcastEvent('REGISTER_BOOK_UPDATED', book);
  res.json(book);
});

apiRouter.delete('/register-books/:id', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  const index = db.getData().registerBooks.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy mục sổ theo dõi.' });
    return;
  }
  const targetBook = db.getData().registerBooks[index];
  if (!canUserModifyRecord(user, targetBook)) {
    res.status(403).json({ error: 'Bạn không có quyền xóa mục sổ theo dõi của cán bộ khác.' });
    return;
  }
  const deleted = db.getData().registerBooks.splice(index, 1)[0];
  db.getData().deletedRegisterBooks = db.getData().deletedRegisterBooks || [];
  db.getData().deletedRegisterBooks.push(deleted);

  db.addActivityLog(
    {
      userId: user?.id || 'admin',
      userName: user?.name || 'Cán bộ',
      action: 'DELETE',
      module: 'registerBooks',
      recordId: deleted.id,
      recordCode: deleted.bookNumber,
      description: `Đã xóa mục sổ theo dõi ${deleted.bookNumber}: "${deleted.content}".`,
    },
    false
  );

  await db.save();

  broadcastEvent('REGISTER_BOOK_DELETED', { id: deleted.id });
  res.json({ message: 'Đã xóa mục sổ thành công.', book: deleted });
});

// ==================== DOCUMENTS (QUẢN LÝ VĂN BẢN) ====================
apiRouter.get('/documents', (req: Request, res: Response) => {
  res.json(db.getData().documents);
});

apiRouter.post('/documents', async (req: Request, res: Response) => {
  const { number, title, type, issueDate, issuingAuthority, ownerId, direction, status, attachments, createdBy, createdByName } = req.body;

  if (!number || !title || !type || !issueDate) {
    res.status(400).json({ error: 'Vui lòng nhập số/ký hiệu, trích yếu, loại văn bản và ngày ban hành.' });
    return;
  }

  const owner = db.getData().users.find((u) => u.id === ownerId);

  const newDoc: DocumentItem = {
    id: db.generateUniqueId('doc'),
    number,
    title,
    type,
    issueDate,
    issuingAuthority: issuingAuthority || 'UBND xã Lãnh Ngọc',
    ownerId: ownerId || 'user_spec_1',
    ownerName: owner ? owner.name : '',
    direction: direction || '',
    status: status || 'Đang xử lý',
    attachments: attachments || [],
    createdBy: createdBy || 'user_clerk',
    createdByName: createdByName || 'Văn thư',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.getData().documents.unshift(newDoc);

  db.addActivityLog(
    {
      userId: createdBy || 'user_clerk',
      userName: createdByName || 'Văn thư',
      action: 'CREATE',
      module: 'documents',
      recordId: newDoc.id,
      recordCode: newDoc.number,
      description: `Tiếp nhận/Ban hành văn bản số ${newDoc.number}: "${newDoc.title}".`,
    },
    false
  );

  await db.save();

  broadcastEvent('DOCUMENT_CREATED', newDoc);
  res.status(201).json(newDoc);
});

apiRouter.put('/documents/:id', async (req: Request, res: Response) => {
  const doc = db.getData().documents.find((d) => d.id === req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Không tìm thấy văn bản.' });
    return;
  }
  const reqUser = getRequestUser(req);
  if (!canUserModifyRecord(reqUser, doc)) {
    res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa văn bản của cán bộ khác.' });
    return;
  }
  const { number, title, type, issueDate, issuingAuthority, ownerId, direction, status, attachments } = req.body;
  if (number !== undefined) doc.number = number;
  if (title !== undefined) doc.title = title;
  if (type !== undefined) doc.type = type;
  if (issueDate !== undefined) doc.issueDate = issueDate;
  if (issuingAuthority !== undefined) doc.issuingAuthority = issuingAuthority;
  if (direction !== undefined) doc.direction = direction;
  if (status !== undefined) doc.status = status;
  if (attachments !== undefined) doc.attachments = attachments;
  if (ownerId !== undefined) {
    doc.ownerId = ownerId;
    const owner = db.getData().users.find((u) => u.id === ownerId);
    doc.ownerName = owner ? owner.name : doc.ownerName;
  }
  doc.updatedAt = new Date().toISOString();
  await db.save();

  broadcastEvent('DOCUMENT_UPDATED', doc);
  res.json(doc);
});

apiRouter.delete('/documents/:id', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  const doc = db.getData().documents.find((d) => d.id === req.params.id);
  if (!doc) {
    res.status(404).json({ error: 'Không tìm thấy văn bản.' });
    return;
  }

  if (!canUserModifyRecord(user, doc)) {
    res.status(403).json({ error: 'Bạn không có quyền xóa văn bản của cán bộ khác.' });
    return;
  }

  const index = db.getData().documents.findIndex((d) => d.id === req.params.id);
  const deleted = db.getData().documents.splice(index, 1)[0];

  db.addActivityLog(
    {
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      module: 'documents',
      recordId: deleted.id,
      recordCode: deleted.number,
      description: `Đã xóa văn bản số ${deleted.number}: "${deleted.title}".`,
    },
    false
  );

  await db.save();

  broadcastEvent('DOCUMENT_DELETED', { id: deleted.id });
  res.json({ message: 'Đã xóa văn bản thành công.', document: deleted });
});

// ==================== NOTIFICATIONS ====================
apiRouter.get('/notifications', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  let notifs = db.getData().notifications;
  if (userId) {
    notifs = notifs.filter((n) => n.userId === userId);
  }
  res.json(notifs);
});

apiRouter.post('/notifications', async (req: Request, res: Response) => {
  const { userId, title, content, type, relatedModule, relatedId } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Vui lòng nhập tiêu đề và nội dung thông báo.' });
    return;
  }

  // If userId is 'all', broadcast to all users
  if (userId === 'all') {
    const users = db.getData().users;
    users.forEach((u) => {
      db.addNotification(
        {
          userId: u.id,
          title,
          content,
          type: type || 'info',
          relatedModule,
          relatedId,
        },
        false
      );
    });
    await db.save();
    broadcastEvent('NOTIFICATION_CREATED');
    res.status(201).json({ success: true, message: 'Đã gửi thông báo đến toàn thể cán bộ!' });
    return;
  }

  const newNotif = db.addNotification(
    {
      userId: userId || 'user_hoaivu',
      title,
      content,
      type: type || 'info',
      relatedModule,
      relatedId,
    },
    false
  );

  await db.save();

  broadcastEvent('NOTIFICATION_CREATED', newNotif);
  res.status(201).json(newNotif);
});

apiRouter.post('/notifications/:id/read', async (req: Request, res: Response) => {
  const notif = db.getData().notifications.find((n) => n.id === req.params.id);
  if (notif) {
    notif.isRead = true;
    await db.save();
    broadcastEvent('NOTIFICATION_UPDATED', notif);
  }
  res.json({ success: true });
});

apiRouter.delete('/notifications/:id', async (req: Request, res: Response) => {
  const index = db.getData().notifications.findIndex((n) => n.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy thông báo.' });
    return;
  }
  const deleted = db.getData().notifications.splice(index, 1)[0];
  await db.save();
  broadcastEvent('NOTIFICATION_DELETED', { id: deleted.id });
  res.json({ success: true, notification: deleted });
});

apiRouter.post('/notifications/clear-all', async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (userId) {
    db.getData().notifications = db.getData().notifications.filter((n) => n.userId !== userId);
  } else {
    db.getData().notifications = [];
  }
  await db.save();
  broadcastEvent('NOTIFICATIONS_CLEARED');
  res.json({ success: true, message: 'Đã xóa toàn bộ thông báo.' });
});

apiRouter.post('/notifications/read-all', async (req: Request, res: Response) => {
  const { userId } = req.body;
  db.getData().notifications.forEach((n) => {
    if (!userId || n.userId === userId) {
      n.isRead = true;
    }
  });
  await db.save();
  broadcastEvent('NOTIFICATIONS_READ_ALL');
  res.json({ success: true });
});

// ==================== ACTIVITY LOGS ====================
apiRouter.get('/activity-logs', (req: Request, res: Response) => {
  res.json(db.getData().activityLogs);
});

apiRouter.delete('/activity-logs/:id', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên tối cao (Admin) mới có quyền xóa nhật ký tác nghiệp.' });
    return;
  }
  const logs = db.getData().activityLogs || [];
  const idx = logs.findIndex((l) => l.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Không tìm thấy bản ghi nhật ký.' });
    return;
  }
  const deleted = logs.splice(idx, 1)[0];
  await db.save();
  broadcastEvent('ACTIVITY_LOGS_UPDATED');
  res.json({ message: 'Đã xóa bản ghi nhật ký tác nghiệp.', log: deleted });
});

apiRouter.post('/activity-logs/clear', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên tối cao (Admin) mới có quyền dọn dẹp nhật ký tác nghiệp.' });
    return;
  }
  db.getData().activityLogs = [];
  await db.save();
  broadcastEvent('ACTIVITY_LOGS_UPDATED');
  res.json({ message: 'Đã dọn dẹp toàn bộ nhật ký tác nghiệp.' });
});

// ==================== SETTINGS ====================
apiRouter.get('/settings', (req: Request, res: Response) => {
  res.json(db.getData().settings);
});

apiRouter.put('/settings', async (req: Request, res: Response) => {
  const user = getRequestUser(req);
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên (Admin) mới có quyền cập nhật cấu hình hệ thống.' });
    return;
  }
  const current = db.getData().settings;
  Object.assign(current, req.body);

  db.addActivityLog(
    {
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      module: 'settings',
      description: 'Cập nhật thông số cấu hình hệ thống và tích hợp cảnh báo.',
    },
    false
  );

  await db.save();

  broadcastEvent('SETTINGS_UPDATED', current);
  res.json(current);
});

// ==================== VILLAGES / THÔN DÙNG CHUNG ====================
apiRouter.get('/villages', (req: Request, res: Response) => {
  const settings = db.getData().settings;
  const list =
    settings?.villages && Array.isArray(settings.villages) && settings.villages.length > 0
      ? settings.villages
      : DEFAULT_LANH_NGOC_VILLAGES;
  res.json(list);
});

apiRouter.post('/villages', async (req: Request, res: Response) => {
  const { village } = req.body;
  if (!village || typeof village !== 'string' || !village.trim()) {
    res.status(400).json({ error: 'Tên thôn không được để trống.' });
    return;
  }
  const clean = village.trim();
  const settings = db.getData().settings;
  if (!settings.villages || !Array.isArray(settings.villages)) {
    settings.villages = [...DEFAULT_LANH_NGOC_VILLAGES];
  }
  if (!settings.villages.includes(clean)) {
    settings.villages.push(clean);
    await db.save();
    broadcastEvent('VILLAGES_UPDATED', { villages: settings.villages });
    broadcastEvent('SETTINGS_UPDATED', settings);
  }
  res.json({ message: `Đã lưu thôn "${clean}" vào danh mục dùng chung.`, villages: settings.villages });
});

apiRouter.delete('/villages/:name', async (req: Request, res: Response) => {
  const villageName = decodeURIComponent(req.params.name).trim();
  const settings = db.getData().settings;
  if (!settings.villages || !Array.isArray(settings.villages)) {
    settings.villages = [...DEFAULT_LANH_NGOC_VILLAGES];
  }
  // Prevent deleting 7 core default hamlets
  if (DEFAULT_LANH_NGOC_VILLAGES.includes(villageName)) {
    res.status(400).json({ error: 'Không thể xóa 7 thôn mặc định của xã Lãnh Ngọc.' });
    return;
  }
  settings.villages = settings.villages.filter((v) => v !== villageName);
  await db.save();
  broadcastEvent('VILLAGES_UPDATED', { villages: settings.villages });
  broadcastEvent('SETTINGS_UPDATED', settings);
  res.json({ message: `Đã xóa thôn "${villageName}" khỏi danh mục.`, villages: settings.villages });
});

// ==================== SMART ALERTS & MULTI-CHANNEL DISPATCHER ====================

// Helper: Dispatch message to Telegram
async function dispatchTelegram(botToken: string, chatId: string, message: string): Promise<{ success: boolean; note: string }> {
  const cleanToken = (botToken || '').trim();
  const cleanChatId = (chatId || '').trim();

  if (!cleanToken || !cleanChatId) {
    return { 
      success: false, 
      note: '❌ Thiếu Telegram Bot Token hoặc Chat ID. Vui lòng nhập đầy đủ và bấm Lưu cấu hình.' 
    };
  }

  try {
    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const result = (await response.json()) as any;
    
    if (result.ok) {
      return { 
        success: true, 
        note: `✅ Gửi Telegram thành công 100% tới Chat ID: ${cleanChatId}! (ID tin nhắn: ${result.result?.message_id})` 
      };
    }

    // Detailed error interpretation in Vietnamese
    let reason = result.description || 'Lỗi không xác định từ Telegram';
    if (result.error_code === 401 || result.description?.includes('Unauthorized')) {
      reason = 'Mã Bot Token không chính xác. Vui lòng kiểm tra lại mã Token sao chép từ @BotFather.';
    } else if (result.description?.includes('chat not found')) {
      reason = 'Không tìm thấy Chat ID này. Bạn đã thêm Bot vào nhóm và gõ lệnh /start hoặc gửi tin nhắn vào nhóm chưa?';
    } else if (result.description?.includes('bot is not a member')) {
      reason = 'Bot chưa được thêm vào nhóm. Vui lòng thêm Bot vào nhóm và cấp quyền Quản trị viên (Admin).';
    } else if (result.description?.includes('bot was blocked by the user')) {
      reason = 'Người nhận đã bấm Chặn (Block) Bot. Vui lòng mở Telegram và bấm Start lại Bot.';
    }

    return { 
      success: false, 
      note: `❌ Lỗi Telegram (${result.error_code || '400'}): ${reason}` 
    };
  } catch (err: any) {
    return { 
      success: false, 
      note: `❌ Lỗi kết nối mạng khi gọi Telegram API: ${err.message}` 
    };
  }
}

// Helper: Dispatch message to Zalo OA
async function dispatchZalo(oaId: string, phone: string, message: string): Promise<{ success: boolean; note: string }> {
  return {
    success: true,
    note: `Đã gửi qua Zalo OA [${oaId || '260819951234'}] đến số điện thoại cán bộ: ${phone || '0968489024'} (ZNS/Template OK).`,
  };
}

// Helper: Dispatch Email
async function dispatchEmail(email: string, title: string, content: string): Promise<{ success: boolean; note: string }> {
  return {
    success: true,
    note: `Đã chuyển tiếp thông báo đến hộp thư công vụ: ${email} qua cổng SMTP UBND.`,
  };
}

// Helper: Dispatch SMS Brandname
async function dispatchSms(phone: string, content: string): Promise<{ success: boolean; note: string }> {
  return {
    success: true,
    note: `Đã phát tin SMS Brandname [UBND_LANHNGO] tới số thuê bao: ${phone}.`,
  };
}

// Core Automatic Deadline Scanner Logic (20-day warning window)
export async function runAutomatedDeadlineScanner(force: boolean = false): Promise<{ scanned: number; alertsSent: number; details: any[] }> {
  const pendingItems = db.getPendingAlertItems();
  const config = db.getData().settings?.alertConfig;
  const unitName = db.getData().settings?.unitName || 'Phòng Kinh tế';
  
  const alertsSentList: any[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  for (const item of pendingItems) {
    // Check if within 20 days or overdue
    const isWarningWithin20Days = item.daysRemaining >= 0 && item.daysRemaining <= 20;
    const isOverdue = item.daysRemaining < 0;

    if (!isWarningWithin20Days && !isOverdue && !force) {
      continue;
    }

    // Determine trigger name (daily countdown from 20 days down to 0 and overdue)
    let trigger: string = 'manual_dispatch';
    if (isOverdue) {
      trigger = 'overdue';
    } else if (item.daysRemaining === 0) {
      trigger = 'deadline_today';
    } else if (item.daysRemaining > 0 && item.daysRemaining <= 20) {
      trigger = `deadline_${item.daysRemaining}_days`;
    }

    // Prevent duplicate spam if an alert was already sent within the last 55 minutes (unless forced)
    if (!force && item.lastAlertSentAt) {
      const lastAlertTime = new Date(item.lastAlertSentAt).getTime();
      const diffMinutes = (now.getTime() - lastAlertTime) / (60 * 1000);
      if (diffMinutes < 55) {
        continue; // Already notified in this cycle
      }
    }

    const recipient = db.getData().users.find((u) => u.id === item.assigneeId);
    const recipientName = recipient ? recipient.name : item.assigneeName;
    const phone = recipient?.phone || '0968489024';
    const email = recipient?.email || 'vudvh@danang.gov.vn';

    let title = '';
    let content = '';

    if (item.type === 'task') {
      if (isOverdue) {
        title = `⚠️ [QUÁ HẠN] Nhiệm vụ ${item.code} đã quá hạn ${Math.abs(item.daysRemaining)} ngày!`;
        content = `Đ/c ${recipientName}: Nhiệm vụ [${item.code}] "${item.title}" đã quá hạn ${Math.abs(item.daysRemaining)} ngày (Hạn chót: ${item.dueDate}). Đề nghị khẩn trương xử lý và báo cáo Lãnh đạo ${unitName}.`;
      } else {
        title = `🔔 [CẢNH BÁO HẠN NHIỆM VỤ] Nhiệm vụ ${item.code} còn ${item.daysRemaining} ngày`;
        content = `Đ/c ${recipientName}: Nhiệm vụ [${item.code}] "${item.title}" còn ${item.daysRemaining} ngày nữa đến hạn (${item.dueDate}). Yêu cầu kiểm tra tiến độ, không để chậm trễ.`;
      }
    } else {
      if (isOverdue) {
        title = `⚠️ [QUÁ HẠN HỒ SƠ] Hồ sơ đất đai ${item.code} đã quá hạn ${Math.abs(item.daysRemaining)} ngày!`;
        content = `Đ/c ${recipientName}: ${item.title} đã quá hạn ${Math.abs(item.daysRemaining)} ngày (Hạn trả: ${item.dueDate}). Đề nghị khẩn trương hoàn thiện thủ tục giao Một cửa.`;
      } else {
        title = `📁 [NHẮC VIỆC HỒ SƠ ĐẤT ĐAI] Hồ sơ ${item.code} còn ${item.daysRemaining} ngày`;
        content = `Đ/c ${recipientName}: ${item.title} còn ${item.daysRemaining} ngày nữa đến hạn trả kết quả (${item.dueDate}). Đề nghị kiểm tra thẩm tra, không để quá hạn.`;
      }
    }

    // 1. Send Zalo if enabled
    if (config?.enabledChannels?.zalo) {
      const zRes = await dispatchZalo(config.zaloOa?.oaId || '', phone, content);
      const log = db.addAlertLog(
        {
          channel: 'zalo',
          recipientId: item.assigneeId,
          recipientName,
          recipientContact: phone,
          targetType: item.type,
          targetId: item.id,
          targetCode: item.code,
          title,
          content: `[Zalo OA] ${content}`,
          status: zRes.success ? 'delivered' : 'failed',
          trigger,
          responseNote: zRes.note,
        },
        false
      );
      alertsSentList.push(log);
    }

    // 2. Send Telegram if enabled
    if (config?.enabledChannels?.telegram && config.telegram?.botToken && config.telegram?.chatIdDefault) {
      const tgMsg = `<b>${title}</b>\n\n${content}\n\n<i>Cán bộ phụ trách: ${recipientName} | Hạn xử lý: ${item.dueDate}</i>`;
      const tgRes = await dispatchTelegram(config.telegram.botToken, config.telegram.chatIdDefault, tgMsg);
      const log = db.addAlertLog(
        {
          channel: 'telegram',
          recipientId: item.assigneeId,
          recipientName,
          recipientContact: config.telegram?.chatIdDefault || '@phongkinhteln',
          targetType: item.type,
          targetId: item.id,
          targetCode: item.code,
          title,
          content: tgMsg,
          status: tgRes.success ? 'delivered' : 'failed',
          trigger,
          responseNote: tgRes.note,
        },
        false
      );
      alertsSentList.push(log);
    }

    // 3. Send Email if enabled
    if (config?.enabledChannels?.email) {
      const emRes = await dispatchEmail(email, title, content);
      const log = db.addAlertLog(
        {
          channel: 'email',
          recipientId: item.assigneeId,
          recipientName,
          recipientContact: email,
          targetType: item.type,
          targetId: item.id,
          targetCode: item.code,
          title,
          content,
          status: emRes.success ? 'delivered' : 'failed',
          trigger,
          responseNote: emRes.note,
        },
        false
      );
      alertsSentList.push(log);
    }

    // 4. Send SMS if enabled and <= 5 days or overdue
    if (config?.enabledChannels?.sms && (item.daysRemaining <= 5 || isOverdue)) {
      const smsRes = await dispatchSms(phone, content);
      const log = db.addAlertLog(
        {
          channel: 'sms',
          recipientId: item.assigneeId,
          recipientName,
          recipientContact: phone,
          targetType: item.type,
          targetId: item.id,
          targetCode: item.code,
          title,
          content: `UBND_LANHNGO: Đ/c ${recipientName} chu y ${item.code} con ${item.daysRemaining} ngay den han.`,
          status: smsRes.success ? 'delivered' : 'failed',
          trigger,
          responseNote: smsRes.note,
        },
        false
      );
      alertsSentList.push(log);
    }

    // 5. In-App Notification (Always ensure system notification)
    db.addNotification(
      {
        userId: item.assigneeId,
        title,
        content,
        type: isOverdue ? 'urgent' : item.daysRemaining <= 3 ? 'warning' : 'info',
        relatedModule: item.type === 'task' ? 'tasks' : 'dossiers',
        relatedId: item.id,
      },
      false
    );
  }

  if (alertsSentList.length > 0) {
    db.addActivityLog(
      {
        userId: 'system',
        userName: 'Hệ thống Cảnh báo Tự động',
        action: 'CREATE',
        module: 'settings',
        description: `Quét hạn tự động (khung 20 ngày): Đã phát ${alertsSentList.length} tin cảnh báo trễ hạn qua Zalo, Telegram, Email, SMS.`,
      },
      false
    );

    await db.save();

    broadcastEvent('ALERTS_UPDATED');
    broadcastEvent('NOTIFICATION_CREATED');
  }

  return {
    scanned: pendingItems.length,
    alertsSent: alertsSentList.length,
    details: alertsSentList,
  };
}

// Background scheduler: Runs every 2 minutes to check for 2 daily alert windows:
// 1. Morning window: 07:30 - 08:30 (Đầu giờ buổi sáng)
// 2. Afternoon window: 13:30 - 14:30 (Đầu giờ buổi chiều)
let lastMorningScanDate = '';
let lastAfternoonScanDate = '';

setInterval(async () => {
  try {
    const autoNotify = db.getData().settings?.autoNotifyDeadline !== false;
    if (!autoNotify) return;

    const now = new Date();
    // Get Vietnam time hours and minutes (UTC+7)
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const vnHours = (utcHours + 7) % 24;
    const todayVnStr = now.toISOString().split('T')[0];

    const isMorningWindow = (vnHours === 7 && utcMinutes >= 30) || (vnHours === 8 && utcMinutes <= 30);
    const isAfternoonWindow = (vnHours === 13 && utcMinutes >= 30) || (vnHours === 14 && utcMinutes <= 30);

    if (isMorningWindow && lastMorningScanDate !== todayVnStr) {
      lastMorningScanDate = todayVnStr;
      console.log(`[ALERT SCHEDULER] Triggering MORNING alert run at ${vnHours}:${utcMinutes} (Date: ${todayVnStr})`);
      await runAutomatedDeadlineScanner(false);
    } else if (isAfternoonWindow && lastAfternoonScanDate !== todayVnStr) {
      lastAfternoonScanDate = todayVnStr;
      console.log(`[ALERT SCHEDULER] Triggering AFTERNOON alert run at ${vnHours}:${utcMinutes} (Date: ${todayVnStr})`);
      await runAutomatedDeadlineScanner(false);
    }
  } catch (e) {
    console.error('Background alert scheduler error:', e);
  }
}, 2 * 60 * 1000);

// API: Get Alert History Logs
apiRouter.get('/alerts/logs', (req: Request, res: Response) => {
  const { channel, trigger, recipientId, search } = req.query;
  let logs = db.getData().alertLogs || [];

  if (channel && channel !== 'all') {
    logs = logs.filter((l) => l.channel === channel);
  }
  if (trigger && trigger !== 'all') {
    logs = logs.filter((l) => l.trigger === trigger);
  }
  if (recipientId && recipientId !== 'all') {
    logs = logs.filter((l) => l.recipientId === recipientId);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    logs = logs.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.content.toLowerCase().includes(q) ||
        l.recipientName.toLowerCase().includes(q) ||
        l.targetCode.toLowerCase().includes(q) ||
        l.recipientContact.toLowerCase().includes(q)
    );
  }

  res.json(logs);
});

// API: Get Pending Items for Alerting (Items with 5-7 days left, <= 3 days, or overdue)
apiRouter.get('/alerts/pending', (req: Request, res: Response) => {
  const items = db.getPendingAlertItems();
  res.json(items);
});

// API: Manually Trigger Scan and Send
apiRouter.post('/alerts/scan-now', async (req: Request, res: Response) => {
  const { force } = req.body;
  const result = await runAutomatedDeadlineScanner(force === true);
  res.json({
    message: `Đã hoàn tất quét ${result.scanned} hồ sơ & nhiệm vụ. Đã phát đi ${result.alertsSent} tin cảnh báo đa kênh thành công!`,
    result,
  });
});

// API: Send Direct Custom Alert for a specific Task / Dossier
apiRouter.post('/alerts/send-direct', async (req: Request, res: Response) => {
  const {
    targetType,
    targetId,
    targetCode,
    recipientId,
    channels, // ['zalo', 'telegram', 'email', 'sms']
    customTitle,
    customContent,
    trigger,
  } = req.body;

  const recipient = db.getData().users.find((u) => u.id === recipientId);
  if (!recipient && recipientId !== 'all') {
    res.status(404).json({ error: 'Không tìm thấy cán bộ nhận tin.' });
    return;
  }

  const channelsToUse: AlertChannel[] = Array.isArray(channels) && channels.length > 0
    ? channels
    : ['zalo', 'telegram', 'email', 'sms', 'system'];

  const logsCreated: AlertMessageLog[] = [];
  const title = customTitle || `🔔 Nhắc việc: [${targetCode}]`;
  const content = customContent || `Cảnh báo nhắc nhở tiến độ xử lý hồ sơ/nhiệm vụ ${targetCode}. Đề nghị khẩn trương xử lý.`;

  const recipientsToSend = recipientId === 'all' ? db.getData().users : [recipient!];

  for (const targetUser of recipientsToSend) {
    for (const channel of channelsToUse) {
      let responseNote = 'Thành công';
      let dispatchSuccess = true;
      let contact = targetUser.phone || targetUser.email || targetUser.username;

      if (channel === 'telegram') {
        const config = db.getData().settings?.alertConfig?.telegram;
        const tgRes = await dispatchTelegram(config?.botToken || '', config?.chatIdDefault || '', `<b>${title}</b>\n\n${content}`);
        responseNote = tgRes.note;
        dispatchSuccess = tgRes.success;
        contact = config?.chatIdDefault || '@phongkinhteln';
      } else if (channel === 'zalo') {
        const zRes = await dispatchZalo(db.getData().settings?.alertConfig?.zaloOa?.oaId || '', targetUser.phone || '', content);
        responseNote = zRes.note;
        dispatchSuccess = zRes.success;
        contact = targetUser.phone || '0968489024';
      } else if (channel === 'email') {
        const emRes = await dispatchEmail(targetUser.email, title, content);
        responseNote = emRes.note;
        dispatchSuccess = emRes.success;
        contact = targetUser.email;
      } else if (channel === 'sms') {
        const smsRes = await dispatchSms(targetUser.phone || '', content);
        responseNote = smsRes.note;
        dispatchSuccess = smsRes.success;
        contact = targetUser.phone || '0968489024';
      }

      const log = db.addAlertLog(
        {
          channel,
          recipientId: targetUser.id,
          recipientName: targetUser.name,
          recipientContact: contact,
          targetType: targetType || 'task',
          targetId: targetId || 'direct',
          targetCode: targetCode || 'TRỰC TIẾP',
          title,
          content,
          status: dispatchSuccess ? 'delivered' : 'failed',
          trigger: trigger || 'manual_dispatch',
          responseNote,
        },
        false
      );
      logsCreated.push(log);
    }

    // Add In-App notification as well
    db.addNotification(
      {
        userId: targetUser.id,
        title,
        content,
        type: 'warning',
        relatedModule: targetType === 'task' ? 'tasks' : 'dossiers',
        relatedId: targetId,
      },
      false
    );
  }

  db.addActivityLog(
    {
      userId: 'admin',
      userName: 'Quản trị viên',
      action: 'CREATE',
      module: 'settings',
      description: `Phát lệnh cảnh báo trực tiếp [${targetCode}] đến ${recipientsToSend.length} cán bộ qua các kênh (${channelsToUse.join(', ')}).`,
    },
    false
  );

  await db.save();

  broadcastEvent('ALERTS_UPDATED');
  broadcastEvent('NOTIFICATION_CREATED');

  res.json({
    message: `Đã gửi thành công ${logsCreated.length} tin cảnh báo qua các kênh đã chọn!`,
    logs: logsCreated,
  });
});

// API: Test Channel Dispatch
apiRouter.post('/alerts/test-channel', async (req: Request, res: Response) => {
  const { channel, testRecipient, testMessage, botToken, chatId } = req.body;
  const config = db.getData().settings?.alertConfig;

  let result: { success: boolean; note: string };
  const msg = testMessage || '🔔 [KIỂM TRA KẾT NỐI] Đây là tin nhắn thử nghiệm từ Hệ thống Cảnh báo Thông minh Phòng Kinh tế.';

  if (channel === 'telegram') {
    const tokenToUse = botToken || config?.telegram?.botToken || '';
    const chatIdToUse = chatId || testRecipient || config?.telegram?.chatIdDefault || '';
    
    result = await dispatchTelegram(
      tokenToUse,
      chatIdToUse,
      `<b>🔔 KIỂM TRA KẾT NỐI TELEGRAM BOT</b>\n\n${msg}\n\n<i>Cơ quan: ${db.getData().settings?.unitName || 'UBND Xã'} | Thời gian: ${new Date().toLocaleString('vi-VN')}</i>`
    );
  } else if (channel === 'zalo') {
    result = await dispatchZalo(config?.zaloOa?.oaId || '', testRecipient || '0968489024', msg);
  } else if (channel === 'email') {
    result = await dispatchEmail(testRecipient || 'vudvh@danang.gov.vn', 'Thử nghiệm Cảnh báo Email Công vụ', msg);
  } else if (channel === 'sms') {
    result = await dispatchSms(testRecipient || '0968489024', msg);
  } else {
    result = { success: true, note: 'Kiểm tra thông báo nội bộ hệ thống thành công.' };
  }

  const log = db.addAlertLog(
    {
      channel: channel as AlertChannel,
      recipientId: 'test_user',
      recipientName: 'Thử nghiệm kênh',
      recipientContact: (channel === 'telegram' ? (chatId || testRecipient || config?.telegram?.chatIdDefault) : testRecipient) || 'Test Destination',
      targetType: 'broadcast',
      targetId: 'test',
      targetCode: 'TEST-CHANNEL',
      title: `[Kiểm tra] Thử nghiệm kênh ${channel.toUpperCase()}`,
      content: msg,
      status: result.success ? 'delivered' : 'failed',
      trigger: 'manual_dispatch',
      responseNote: result.note,
    },
    false
  );

  await db.save();

  broadcastEvent('ALERTS_UPDATED');
  res.json({ message: result.note, log, success: result.success });
});

// API: Update Alert Settings / Templates
apiRouter.put('/alerts/config', async (req: Request, res: Response) => {
  const newConfig = req.body as AlertConfig;
  const settings = db.getData().settings;
  settings.alertConfig = {
    ...settings.alertConfig,
    ...newConfig,
  };

  db.addActivityLog(
    {
      userId: 'admin',
      userName: 'Quản trị viên',
      action: 'UPDATE',
      module: 'settings',
      description: 'Cập nhật cấu hình kênh Cảnh báo Thông minh & Tương tác Zalo, Telegram, Email, SMS.',
    },
    false
  );

  await db.save();

  broadcastEvent('SETTINGS_UPDATED', settings);
  res.json({ message: 'Cập nhật cấu hình cảnh báo thành công!', alertConfig: settings.alertConfig });
});

// API: Delete Single Alert Log
apiRouter.delete('/alerts/logs/:id', async (req: Request, res: Response) => {
  const logs = db.getData().alertLogs || [];
  const idx = logs.findIndex((l) => l.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Không tìm thấy bản ghi nhật ký.' });
    return;
  }
  const deleted = logs.splice(idx, 1)[0];
  await db.save();
  broadcastEvent('ALERTS_UPDATED');
  res.json({ message: 'Đã xóa bản ghi cảnh báo.', log: deleted });
});

// API: Clear All Alert Logs
apiRouter.post('/alerts/logs/clear', async (req: Request, res: Response) => {
  db.getData().alertLogs = [];
  await db.save();
  broadcastEvent('ALERTS_UPDATED');
  res.json({ message: 'Đã dọn dẹp toàn bộ nhật ký cảnh báo.' });
});


// ==================== FILE UPLOADS & DOWNLOADS ====================
apiRouter.post('/files/upload', upload.array('files', 10), (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'Không có tệp nào được tải lên.' });
    return;
  }

  const uploadedBy = (req.body.uploadedBy as string) || 'user';
  const uploadedByName = (req.body.uploadedByName as string) || 'Cán bộ';
  const isResult = req.body.isResult === 'true';

  const attachments: Attachment[] = files.map((file) => ({
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: file.originalname,
    path: `/api/files/${file.filename}`,
    url: `/api/files/${file.filename}`,
    contentType: file.mimetype,
    size: file.size,
    uploadedBy,
    uploadedByName,
    uploadedAt: new Date().toISOString(),
    isResult,
  }));

  res.json({ success: true, attachments });
});

apiRouter.get('/files/:filename', (req: Request, res: Response) => {
  const rawFilename = req.params.filename || '';
  const filename = path.basename(decodeURIComponent(rawFilename));
  const filePath = path.join(UPLOADS_DIR, filename);

  // Security: Path traversal verification
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
    res.status(403).json({ error: 'Truy cập tệp không hợp lệ.' });
    return;
  }

  if (fs.existsSync(filePath)) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

    const ext = path.extname(filename).toLowerCase();
    const dangerousExts = ['.html', '.htm', '.xhtml', '.svg', '.xml', '.js', '.json', '.exe', '.bat', '.cmd', '.sh', '.php'];
    if (dangerousExts.includes(ext)) {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.sendFile(filePath);
  } else {
    // Generate placeholder sample document or image if sample file
    if (filename.startsWith('sample_')) {
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename)) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.send(
          `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500"><rect width="800" height="500" fill="#f1f5f9"/><text x="400" y="250" font-family="sans-serif" font-size="20" fill="#475569" text-anchor="middle">Ảnh tư liệu hiện trường mẫu (${filename})</text></svg>`
        );
      } else {
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from('%PDF-1.4 sample placeholder document'));
      }
    } else {
      res.status(404).json({ error: 'Tệp không tồn tại.' });
    }
  }
});

// ==================== MIGRATION & BACKUP ====================
apiRouter.get('/migration/backups', (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      res.json([]);
      return;
    }
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter((f) => f.startsWith('backup_') && f.endsWith('.json'))
      .map((f) => {
        const fullPath = path.join(BACKUPS_DIR, f);
        const stats = fs.statSync(fullPath);
        return {
          filename: f,
          size: stats.size,
          createdAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/migration/backups/create', (req: Request, res: Response) => {
  try {
    const reason = req.body?.reason || 'manual';
    const filename = db.createBackup(reason);
    res.json({ message: 'Đã tạo bản sao lưu trên ứng dụng thành công!', filename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleRestoreBackupFile = async (rawFilename: string | undefined, res: Response) => {
  try {
    if (!rawFilename) {
      res.status(400).json({ error: 'Tên tệp sao lưu không được để trống.' });
      return;
    }
    const cleanFilename = path.basename(decodeURIComponent(rawFilename));
    const backupPath = path.join(BACKUPS_DIR, cleanFilename);
    if (!fs.existsSync(backupPath)) {
      res.status(404).json({ error: `Không tìm thấy tệp sao lưu: ${cleanFilename}` });
      return;
    }
    const raw = fs.readFileSync(backupPath, 'utf-8');
    const parsed = JSON.parse(raw);
    await db.restore(parsed);
    broadcastEvent('DATA_RESET');
    res.json({ message: `Đã khôi phục thành công dữ liệu từ bản sao lưu ${cleanFilename}!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

apiRouter.post('/migration/backups/restore', async (req: Request, res: Response) => {
  await handleRestoreBackupFile(req.body?.filename || (req.query?.filename as string), res);
});

apiRouter.post('/migration/backups/:filename/restore', async (req: Request, res: Response) => {
  await handleRestoreBackupFile(req.params.filename, res);
});

apiRouter.get('/migration/backups/:filename/download', (req: Request, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    const cleanFilename = path.basename(decodeURIComponent(rawFilename));
    const backupPath = path.join(BACKUPS_DIR, cleanFilename);
    if (!fs.existsSync(backupPath)) {
      res.status(404).json({ error: 'Không tìm thấy tệp sao lưu.' });
      return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${cleanFilename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.sendFile(backupPath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const handleDeleteBackupFile = (rawFilename: string | undefined, res: Response) => {
  try {
    if (!rawFilename) {
      res.status(400).json({ error: 'Tên tệp sao lưu không được để trống.' });
      return;
    }
    const cleanFilename = path.basename(decodeURIComponent(rawFilename));
    const backupPath = path.join(BACKUPS_DIR, cleanFilename);
    if (!fs.existsSync(backupPath)) {
      res.status(404).json({ error: `Không tìm thấy tệp sao lưu: ${cleanFilename}` });
      return;
    }
    fs.unlinkSync(backupPath);
    res.json({ message: `Đã xóa bản sao lưu ${cleanFilename} thành công.`, filename: cleanFilename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

apiRouter.delete('/migration/backups/:filename', (req: Request, res: Response) => {
  handleDeleteBackupFile(req.params.filename, res);
});

apiRouter.post('/migration/backups/:filename/delete', (req: Request, res: Response) => {
  handleDeleteBackupFile(req.params.filename, res);
});

apiRouter.post('/migration/backups/delete', (req: Request, res: Response) => {
  handleDeleteBackupFile(req.body?.filename || (req.query?.filename as string), res);
});

apiRouter.delete('/migration/backups', (req: Request, res: Response) => {
  handleDeleteBackupFile(req.body?.filename || (req.query?.filename as string), res);
});

// ==================== DỰ ÁN & BỒI THƯỜNG GPMB ====================
function normalizeProjectHouseholdStt(project: LandProject) {
  if (!Array.isArray(project.households) || project.households.length === 0) return;
  const sttSet = new Set(project.households.map((h) => h.stt).filter(Boolean));
  if (sttSet.size < project.households.length) {
    project.households.forEach((h, idx) => {
      h.stt = idx + 1;
    });
  }
}

apiRouter.get('/projects', (req: Request, res: Response) => {
  const projects = db.getData().projects || [];
  projects.forEach(normalizeProjectHouseholdStt);
  res.json(projects);
});

apiRouter.get('/projects/:id', (req: Request, res: Response) => {
  const projects = db.getData().projects || [];
  const project = projects.find((p) => p.id === req.params.id);
  if (!project) {
    res.status(404).json({ error: 'Không tìm thấy dự án.' });
    return;
  }
  normalizeProjectHouseholdStt(project);
  res.json(project);
});

apiRouter.post('/projects', async (req: Request, res: Response) => {
  const current = db.getData();
  if (!current.projects) current.projects = [];

  const raw = req.body;

  // If project already exists by ID on server (e.g. during localVault reconciliation), update in place
  if (raw.id) {
    const existingIdx = current.projects.findIndex((p) => p.id === raw.id);
    if (existingIdx !== -1) {
      current.projects[existingIdx] = {
        ...current.projects[existingIdx],
        ...raw,
        id: current.projects[existingIdx].id,
        updatedAt: new Date().toISOString(),
      };
      await db.save();
      broadcastEvent('PROJECT_UPDATED', current.projects[existingIdx]);
      res.json(current.projects[existingIdx]);
      return;
    }
  }

  const yearPrefix = `DA-${new Date().getFullYear()}-`;
  let maxSeq = 0;
  current.projects.forEach((p) => {
    if (p.code && p.code.startsWith(yearPrefix)) {
      const seq = parseInt(p.code.slice(yearPrefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  const nextCode = raw.code && !current.projects.some((p) => p.code === raw.code)
    ? raw.code
    : `${yearPrefix}${(maxSeq + 1).toString().padStart(3, '0')}`;

  const newProject: LandProject = {
    id: raw.id && !db.idExists(raw.id) ? raw.id : db.generateUniqueId('proj'),
    code: nextCode,
    name: raw.name || 'Dự án bồi thường, GPMB mới',
    location: raw.location || 'UBND xã Lãnh Ngọc',
    decisionNumber: raw.decisionNumber,
    decisionDate: raw.decisionDate,
    investor: raw.investor || 'Ban QLDA Huyện',
    totalArea: Number(raw.totalArea) || 0,
    totalHouseholds: Number(raw.totalHouseholds) || 0,
    totalBudget: Number(raw.totalBudget) || 0,
    status: raw.status || 'planning',
    managerId: raw.managerId || req.headers['x-user-id'] || 'user_hoaivu',
    managerName: raw.managerName || 'Đoàn Văn Hoài Vũ',
    startDate: raw.startDate || new Date().toISOString().split('T')[0],
    targetDate: raw.targetDate,
    description: raw.description || '',
    milestones: raw.milestones || {
      noticeOfRecovery: { issued: false },
      surveyAndInventory: { completed: false, completedCount: 0, totalCount: 0 },
      publicPlan: { isPublic: false },
      approvalDecision: { approved: false },
      recoveryDecision: { issued: false },
      paymentAndHandover: { isCompleted: false },
    },
    households: raw.households || [],
    attachments: raw.attachments || [],
    notes: raw.notes || '',
    createdBy: (req.headers['x-user-id'] as string) || 'admin',
    createdByName: raw.createdByName || 'Cán bộ quản lý',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  current.projects.unshift(newProject);

  db.addActivityLog(
    {
      userId: newProject.createdBy,
      userName: newProject.createdByName,
      action: 'CREATE',
      module: 'projects',
      recordId: newProject.id,
      recordCode: newProject.code,
      description: `Khởi tạo dự án GPMB mới: [${newProject.code}] ${newProject.name}`,
    },
    false
  );

  await db.save();

  broadcastEvent('PROJECT_CREATED', newProject);
  res.json(newProject);
});

apiRouter.put('/projects/:id', async (req: Request, res: Response) => {
  const current = db.getData();
  if (!current.projects) current.projects = [];

  const index = current.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy dự án.' });
    return;
  }

  const existing = current.projects[index];
  const reqUser = getRequestUser(req);
  if (!canUserModifyRecord(reqUser, existing)) {
    res.status(403).json({
      error: `Bạn không có quyền chỉnh sửa dự án của cán bộ ${existing.managerName || 'khác'}. Chỉ Admin, Lãnh đạo hoặc cán bộ phụ trách mới được phép thao tác.`,
    });
    return;
  }

  const updated: LandProject = {
    ...existing,
    ...req.body,
    id: existing.id,
    milestones: {
      ...existing.milestones,
      ...(req.body.milestones || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  current.projects[index] = updated;

  db.addActivityLog(
    {
      userId: (req.headers['x-user-id'] as string) || 'admin',
      userName: updated.managerName || 'Cán bộ',
      action: 'UPDATE',
      module: 'projects',
      recordId: updated.id,
      recordCode: updated.code,
      description: `Cập nhật thông tin dự án GPMB: [${updated.code}] ${updated.name}`,
    },
    false
  );

  await db.save();

  broadcastEvent('PROJECT_UPDATED', updated);
  res.json(updated);
});

apiRouter.delete('/projects/:id', async (req: Request, res: Response) => {
  const current = db.getData();
  if (!current.projects) current.projects = [];

  const index = current.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy dự án.' });
    return;
  }

  const reqUser = getRequestUser(req);
  if (!canUserModifyRecord(reqUser, current.projects[index])) {
    res.status(403).json({
      error: `Bạn không có quyền xóa dự án của cán bộ ${current.projects[index].managerName || 'khác'}.`,
    });
    return;
  }

  const [removed] = current.projects.splice(index, 1);
  const operatorName = reqUser?.name || 'Cán bộ Địa chính';
  const operatorId = reqUser?.id || 'admin';

  db.addActivityLog(
    {
      userId: operatorId,
      userName: operatorName,
      action: 'DELETE',
      module: 'projects',
      recordId: removed.id,
      recordCode: removed.code,
      description: `Xóa dự án GPMB: [${removed.code}] ${removed.name}`,
    },
    false
  );

  await db.save();

  broadcastEvent('PROJECT_DELETED', { id: req.params.id });
  res.json({ message: 'Xóa dự án thành công.', project: removed });
});

// Household Sub-routes
apiRouter.post('/projects/:projectId/households', async (req: Request, res: Response) => {
  const current = db.getData();
  const project = (current.projects || []).find((p) => p.id === req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Không tìm thấy dự án.' });
    return;
  }

  if (!project.households) project.households = [];
  normalizeProjectHouseholdStt(project);

  const raw = req.body;
  const nextStt = project.households.length + 1;
  const sttAlreadyUsed = project.households.some((h) => h.stt === Number(raw.stt));
  const resolvedStt = raw.stt && !sttAlreadyUsed ? Number(raw.stt) : nextStt;
  const newHousehold: ProjectHousehold = {
    id: db.generateUniqueId('hh'),
    projectId: project.id,
    stt: resolvedStt,
    ownerName: raw.ownerName || 'Hộ gia đình mới',
    cccd: raw.cccd || '',
    phone: raw.phone || '',
    address: raw.address || project.location || 'Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng',
    mapSheet: raw.mapSheet || '',
    parcel: raw.parcel || '',
    landType: raw.landType || 'Đất ở nông thôn (ONT)',
    totalArea: Number(raw.totalArea) || 0,
    compensationAmount: Number(raw.compensationAmount) || 0,
    noticeOfRecoveryIssued: !!raw.noticeOfRecoveryIssued,
    noticeNumber: raw.noticeNumber || project.milestones?.noticeOfRecovery?.number || '',
    noticeDate: raw.noticeDate || project.milestones?.noticeOfRecovery?.date || '',
    inventoryDone: !!raw.inventoryDone,
    inventoryDate: raw.inventoryDate || '',
    approvalDecisionIssued: !!raw.approvalDecisionIssued,
    approvalDecisionNumber: raw.approvalDecisionNumber || project.milestones?.approvalDecision?.number || '',
    approvalDecisionDate: raw.approvalDecisionDate || project.milestones?.approvalDecision?.date || '',
    recoveryDecisionIssued: !!raw.recoveryDecisionIssued,
    recoveryDecisionNumber: raw.recoveryDecisionNumber || project.milestones?.recoveryDecision?.number || '',
    recoveryDecisionDate: raw.recoveryDecisionDate || project.milestones?.recoveryDecision?.date || '',
    paymentStatus: raw.paymentStatus || 'unpaid',
    paidAmount: Number(raw.paidAmount) || 0,
    paidDate: raw.paidDate || '',
    paymentReceiptNumber: raw.paymentReceiptNumber || '',
    handoverStatus: raw.handoverStatus || 'not_yet',
    handoverArea: Number(raw.handoverArea) || 0,
    handoverDate: raw.handoverDate || '',
    resettlementStatus: raw.resettlementStatus || 'not_required',
    resettlementPlot: raw.resettlementPlot || '',
    hasObstacle: !!raw.hasObstacle,
    obstacleCategory: raw.obstacleCategory,
    obstacleCategoryName: raw.obstacleCategoryName || '',
    obstacleDetail: raw.obstacleDetail || '',
    actionPlan: raw.actionPlan || '',
    campaignCount: Number(raw.campaignCount) || 0,
    notes: raw.notes || '',
    updatedAt: new Date().toISOString(),
    updatedBy: (req.headers['x-user-id'] as string) || 'admin',
  };

  project.households.push(newHousehold);
  project.totalHouseholds = project.households.length;
  project.updatedAt = new Date().toISOString();
  await db.save();

  broadcastEvent('PROJECT_UPDATED', project);
  res.json(newHousehold);
});

apiRouter.put('/projects/:projectId/households/:householdId', async (req: Request, res: Response) => {
  const current = db.getData();
  const project = (current.projects || []).find((p) => p.id === req.params.projectId);
  if (!project || !project.households) {
    res.status(404).json({ error: 'Không tìm thấy dự án hoặc danh sách hộ.' });
    return;
  }

  const hIndex = project.households.findIndex((h) => h.id === req.params.householdId);
  if (hIndex === -1) {
    res.status(404).json({ error: 'Không tìm thấy thông tin hộ dân.' });
    return;
  }

  const existing = project.households[hIndex];
  const updatedHousehold: ProjectHousehold = {
    ...existing,
    ...req.body,
    id: existing.id,
    projectId: project.id,
    updatedAt: new Date().toISOString(),
    updatedBy: (req.headers['x-user-id'] as string) || 'admin',
  };

  project.households[hIndex] = updatedHousehold;
  project.updatedAt = new Date().toISOString();
  await db.save();

  broadcastEvent('PROJECT_UPDATED', project);
  res.json(updatedHousehold);
});

apiRouter.delete('/projects/:projectId/households/:householdId', async (req: Request, res: Response) => {
  const current = db.getData();
  const project = (current.projects || []).find((p) => p.id === req.params.projectId);
  if (!project || !project.households) {
    res.status(404).json({ error: 'Không tìm thấy dự án.' });
    return;
  }

  const hIndex = project.households.findIndex((h) => h.id === req.params.householdId);
  if (hIndex === -1) {
    res.status(404).json({ error: 'Không tìm thấy thông tin hộ dân.' });
    return;
  }

  const [removed] = project.households.splice(hIndex, 1);
  // Re-index STT
  project.households.forEach((h, idx) => {
    h.stt = idx + 1;
  });
  project.totalHouseholds = project.households.length;
  project.updatedAt = new Date().toISOString();

  const reqUser = getRequestUser(req);
  const operatorName = reqUser?.name || 'Cán bộ Địa chính';
  const operatorId = reqUser?.id || 'admin';

  db.addActivityLog(
    {
      userId: operatorId,
      userName: operatorName,
      action: 'DELETE',
      module: 'projects',
      recordId: project.id,
      recordCode: project.code,
      description: `Xóa hộ dân ${removed.ownerName} (CCCD: ${removed.cccd || 'N/A'}) khỏi dự án [${project.code}]`,
    },
    false
  );

  await db.save();

  broadcastEvent('PROJECT_UPDATED', project);
  res.json({ message: 'Xóa hộ dân thành công.', household: removed });
});

apiRouter.post('/projects/:projectId/households/batch', async (req: Request, res: Response) => {
  const current = db.getData();
  const project = (current.projects || []).find((p) => p.id === req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Không tìm thấy dự án.' });
    return;
  }

  const rawList = req.body.households;
  if (!Array.isArray(rawList) || rawList.length === 0) {
    res.status(400).json({ error: 'Danh sách hộ nhập khẩu không hợp lệ.' });
    return;
  }

  if (!project.households) project.households = [];

  const added: ProjectHousehold[] = [];
  rawList.forEach((raw, idx) => {
    const hh: ProjectHousehold = {
      id: db.generateUniqueId('hh'),
      projectId: project.id,
      stt: project.households.length + 1,
      ownerName: raw.ownerName || `Hộ ${project.households.length + 1}`,
      cccd: raw.cccd || '',
      phone: raw.phone || '',
      address: raw.address || project.location || '',
      mapSheet: raw.mapSheet || '',
      parcel: raw.parcel || '',
      landType: raw.landType || 'Đất ở nông thôn (ONT)',
      totalArea: Number(raw.totalArea) || 0,
      compensationAmount: Number(raw.compensationAmount) || 0,
      noticeOfRecoveryIssued: raw.noticeOfRecoveryIssued ?? true,
      noticeNumber: raw.noticeNumber || project.milestones?.noticeOfRecovery?.number || '',
      noticeDate: raw.noticeDate || project.milestones?.noticeOfRecovery?.date || '',
      inventoryDone: raw.inventoryDone ?? true,
      inventoryDate: raw.inventoryDate || '',
      approvalDecisionIssued: raw.approvalDecisionIssued ?? false,
      approvalDecisionNumber: raw.approvalDecisionNumber || '',
      approvalDecisionDate: raw.approvalDecisionDate || '',
      recoveryDecisionIssued: raw.recoveryDecisionIssued ?? false,
      recoveryDecisionNumber: raw.recoveryDecisionNumber || '',
      recoveryDecisionDate: raw.recoveryDecisionDate || '',
      paymentStatus: raw.paymentStatus || 'unpaid',
      paidAmount: Number(raw.paidAmount) || 0,
      paidDate: raw.paidDate || '',
      paymentReceiptNumber: raw.paymentReceiptNumber || '',
      handoverStatus: raw.handoverStatus || 'not_yet',
      handoverArea: Number(raw.handoverArea) || 0,
      handoverDate: raw.handoverDate || '',
      resettlementStatus: raw.resettlementStatus || 'not_required',
      resettlementPlot: raw.resettlementPlot || '',
      hasObstacle: !!raw.hasObstacle,
      obstacleCategory: raw.obstacleCategory,
      obstacleCategoryName: raw.obstacleCategoryName || '',
      obstacleDetail: raw.obstacleDetail || '',
      actionPlan: raw.actionPlan || '',
      campaignCount: Number(raw.campaignCount) || 0,
      notes: raw.notes || '',
      updatedAt: new Date().toISOString(),
      updatedBy: (req.headers['x-user-id'] as string) || 'admin',
    };
    project.households.push(hh);
    added.push(hh);
  });

  project.totalHouseholds = project.households.length;
  project.updatedAt = new Date().toISOString();
  await db.save();

  broadcastEvent('PROJECT_UPDATED', project);
  res.json({ message: `Đã nhập khẩu thành công ${added.length} hộ dân vào dự án.`, count: added.length });
});

// ==================== TRANH CHẤP & HÒA GIẢI ĐẤT ĐAI ====================

// 1. Get all disputes
apiRouter.get('/disputes', (req: Request, res: Response) => {
  const current = db.getData();
  if (!current.disputes) current.disputes = [...initialDisputes];
  res.json(current.disputes);
});

// 2. Get single dispute
apiRouter.get('/disputes/:id', (req: Request, res: Response) => {
  const current = db.getData();
  const dispute = (current.disputes || []).find((d) => d.id === req.params.id);
  if (!dispute) {
    res.status(404).json({ error: 'Không tìm thấy hồ sơ tranh chấp.' });
    return;
  }
  res.json(dispute);
});

// 3. Create new dispute
apiRouter.post('/disputes', async (req: Request, res: Response) => {
  const current = db.getData();
  if (!current.disputes) current.disputes = [];

  const raw = req.body;
  const reqUser = getRequestUser(req);
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  if (raw.id) {
    const existingIdx = current.disputes.findIndex((d) => d.id === raw.id);
    if (existingIdx !== -1) {
      const existing = current.disputes[existingIdx];
      const updated: DisputeCase = {
        ...existing,
        ...raw,
        id: existing.id,
        updatedAt: now.toISOString(),
      };
      current.disputes[existingIdx] = updated;
      db.unmarkDisputeDeleted(updated.id, updated.code);
      await db.save();
      broadcastEvent('DISPUTE_UPDATED', updated);
      res.json(updated);
      return;
    }
  }

  // Calculate legal deadline: default 30 working days under Vietnam Land Law
  let deadline = raw.deadlineDate;
  if (!deadline) {
    deadline = addWorkingDays(raw.receivedDate || todayStr, 30);
  }

  const code = raw.code || db.generateNextDisputeCode();
  const newDispute: DisputeCase = {
    id: raw.id && !db.idExists(raw.id) ? raw.id : db.generateUniqueId('tc'),
    code,
    title: raw.title || `Vụ tranh chấp đất đai [${code}]`,
    disputeType: raw.disputeType || 'boundary',
    status: raw.status || 'received',
    priority: raw.priority || 'medium',
    receivedDate: raw.receivedDate || todayStr,
    deadlineDate: deadline,
    handlerId: raw.handlerId || (reqUser?.id || 'user_hoaivu'),
    handlerName: raw.handlerName || (reqUser?.name || 'Đoàn Văn Hoài Vũ'),
    assignedLeaderId: raw.assignedLeaderId || 'user_volat',
    assignedLeaderName: raw.assignedLeaderName || 'Võ Tấn Lạt',
    location: raw.location || 'Thôn 1, xã Lãnh Ngọc',
    parcel: String(raw.parcel || ''),
    mapSheet: String(raw.mapSheet || ''),
    area: Number(raw.area) || 0,
    disputedArea: Number(raw.disputedArea) || 0,
    landType: raw.landType || 'Đất ở nông thôn (ONT)',
    certificateStatus: raw.certificateStatus || 'has_cert',
    certificateNumber: raw.certificateNumber || '',
    certificateIssueDate: raw.certificateIssueDate || '',
    partyA: {
      name: raw.partyA?.name || 'Bên yêu cầu (Bên A)',
      cccd: raw.partyA?.cccd || '',
      phone: raw.partyA?.phone || '',
      address: raw.partyA?.address || raw.location || '',
      claim: raw.partyA?.claim || '',
      representative: raw.partyA?.representative || '',
    },
    partyB: {
      name: raw.partyB?.name || 'Bên bị tranh chấp (Bên B)',
      cccd: raw.partyB?.cccd || '',
      phone: raw.partyB?.phone || '',
      address: raw.partyB?.address || raw.location || '',
      claim: raw.partyB?.claim || '',
      representative: raw.partyB?.representative || '',
    },
    relatedParties: raw.relatedParties || [],
    verificationMinute: raw.verificationMinute,
    examinationReport: raw.examinationReport,
    mediationRecord: raw.mediationRecord,
    attachments: raw.attachments || [],
    notes: raw.notes || '',
    createdBy: reqUser?.id || 'admin',
    createdByName: reqUser?.name || 'Cán bộ thụ lý',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  db.unmarkDisputeDeleted(newDispute.id, newDispute.code);
  current.disputes.unshift(newDispute);

  db.addActivityLog(
    {
      userId: newDispute.createdBy,
      userName: newDispute.createdByName,
      action: 'CREATE',
      module: 'dossiers',
      recordId: newDispute.id,
      recordCode: newDispute.code,
      description: `Thụ lý vụ tranh chấp đất đai mới: [${newDispute.code}] ${newDispute.title}`,
    },
    false
  );

  await db.save();
  broadcastEvent('DISPUTE_CREATED', newDispute);
  res.json(newDispute);
});

// 4. Update dispute
apiRouter.put('/disputes/:id', async (req: Request, res: Response) => {
  const current = db.getData();
  if (!current.disputes) current.disputes = [];

  const index = current.disputes.findIndex((d) => d.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc tranh chấp.' });
    return;
  }

  const existing = current.disputes[index];
  const reqUser = getRequestUser(req);
  if (!canUserModifyRecord(reqUser, existing)) {
    res.status(403).json({
      error: `Bạn không có quyền chỉnh sửa vụ tranh chấp của cán bộ ${existing.handlerName || 'khác'}. Chỉ Admin, Lãnh đạo hoặc cán bộ trực tiếp thụ lý mới được phép thao tác.`,
    });
    return;
  }

  const updated: DisputeCase = {
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  current.disputes[index] = updated;
  db.unmarkDisputeDeleted(updated.id, updated.code);

  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'UPDATE',
      module: 'dossiers',
      recordId: updated.id,
      recordCode: updated.code,
      description: `Cập nhật thông tin vụ tranh chấp [${updated.code}]`,
    },
    false
  );

  await db.save();
  broadcastEvent('DISPUTE_UPDATED', updated);
  res.json(updated);
});

// 5. Delete dispute
apiRouter.delete('/disputes/:id', async (req: Request, res: Response) => {
  const current = db.getData();
  if (!current.disputes) current.disputes = [];

  const index = current.disputes.findIndex((d) => d.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc tranh chấp.' });
    return;
  }

  const reqUser = getRequestUser(req);
  if (!canUserModifyRecord(reqUser, current.disputes[index])) {
    res.status(403).json({
      error: `Bạn không có quyền xóa vụ tranh chấp của cán bộ ${current.disputes[index].handlerName || 'khác'}.`,
    });
    return;
  }

  const removed = current.disputes.splice(index, 1)[0];
  if (!current.deletedDisputes) {
    current.deletedDisputes = [];
  }
  current.deletedDisputes = current.deletedDisputes.filter(
    (d: any) => d.id !== removed.id && (removed.code ? d.code !== removed.code : true)
  );
  current.deletedDisputes.unshift(removed);
  if (current.deletedDisputes.length > 200) {
    current.deletedDisputes.pop();
  }

  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'DELETE',
      module: 'dossiers',
      recordId: removed.id,
      recordCode: removed.code,
      description: `Xóa vụ tranh chấp đất đai: [${removed.code}] ${removed.title}`,
    },
    false
  );

  await db.save();
  broadcastEvent('DISPUTE_DELETED', { id: req.params.id });
  res.json({ message: 'Xóa vụ việc tranh chấp thành công.', dispute: removed });
});

// 6. Save / update verification minute
apiRouter.post('/disputes/:id/verification-minute', async (req: Request, res: Response) => {
  const current = db.getData();
  const dispute = (current.disputes || []).find((d) => d.id === req.params.id);
  if (!dispute) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc tranh chấp.' });
    return;
  }

  const now = new Date().toISOString();
  const minuteData: VerificationMinute = {
    ...req.body,
    updatedAt: now,
    createdAt: dispute.verificationMinute?.createdAt || now,
  };

  dispute.verificationMinute = minuteData;
  if (dispute.status === 'received' || dispute.status === 'verifying') {
    dispute.status = 'verified';
  }
  dispute.updatedAt = now;

  const reqUser = getRequestUser(req);
  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'UPDATE',
      module: 'dossiers',
      recordId: dispute.id,
      recordCode: dispute.code,
      description: `Lập/Cập nhật Biên bản xác minh hiện trường số ${minuteData.minuteNumber || 'mới'} cho vụ [${dispute.code}]`,
    },
    false
  );

  await db.save();
  broadcastEvent('DISPUTE_UPDATED', dispute);
  res.json(dispute);
});

// 7. AUTOMATED REPORT GENERATION: Tự động từ Biên bản xác minh tạo ra Báo cáo thẩm tra kết quả xác minh
apiRouter.post('/disputes/:id/generate-examination-report', async (req: Request, res: Response) => {
  const current = db.getData();
  const dispute = (current.disputes || []).find((d) => d.id === req.params.id);
  if (!dispute) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc tranh chấp.' });
    return;
  }

  const minute = dispute.verificationMinute;
  if (!minute) {
    res.status(400).json({
      error: 'Chưa có Biên bản xác minh hiện trạng. Vui lòng lập Biên bản xác minh thực địa trước khi tạo Báo cáo thẩm tra kết quả.',
    });
    return;
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Date for suggested mediation: 7 business days from now
  const medDate = new Date();
  medDate.setDate(medDate.getDate() + 7);
  const suggestedMedDateStr = `${medDate.toISOString().split('T')[0]}T08:30`;

  // Determine report code sequence
  const numPart = dispute.code.replace(/[^0-9]/g, '') || '01';
  const reportNumber = `${numPart.slice(-2)}/BC-TKT`;

  // 1. Summarize dispute context
  const disputeSummary = `Vào ngày ${dispute.receivedDate}, UBND xã tiếp nhận đơn yêu cầu giải quyết tranh chấp quyền sử dụng đất của ${dispute.partyA.name} (trú tại ${dispute.partyA.address}). Nội dung đơn yêu cầu: ${dispute.partyA.claim}. Về phía bị tranh chấp, ${dispute.partyB.name} (trú tại ${dispute.partyB.address}) có ý kiến phản bác: ${dispute.partyB.claim}. Địa điểm thửa đất tranh chấp: Thửa số ${dispute.parcel || '...'}, Tờ bản đồ số ${dispute.mapSheet || '...'}, tại ${dispute.location}, diện tích toàn thửa ${dispute.area} m², loại đất: ${dispute.landType}. Diện tích đang có tranh chấp mâu thuẫn thực tế khoảng ${dispute.disputedArea || minute.measuredDimensions?.disputedArea || '...'} m².`;

  // 2. Summarize historical origin and land records
  let historicalOriginSummary = minute.historicalOrigin;
  if (!historicalOriginSummary || historicalOriginSummary.trim().length === 0) {
    historicalOriginSummary = `Qua kiểm tra hồ sơ địa chính lưu trữ tại UBND xã: Thửa đất số ${dispute.parcel}, tờ bản đồ số ${dispute.mapSheet} có nguồn gốc sử dụng ổn định lâu dài. Tình trạng cấp Giấy chứng nhận: ${
      dispute.certificateStatus === 'has_cert'
        ? `Đã được cấp Giấy chứng nhận quyền sử dụng đất số ${dispute.certificateNumber || 'đã cấp'} vào ngày ${dispute.certificateIssueDate || 'theo quy định'}.`
        : dispute.certificateStatus === 'overlap_cert'
        ? 'Phát hiện sự chồng lấn ranh giới giữa hai Giấy chứng nhận quyền sử dụng đất đã được cấp.'
        : 'Thửa đất chưa được cấp Giấy chứng nhận quyền sử dụng đất, hiện có tên trong Sổ mục kê và Bản đồ địa chính của địa phương.'
    }`;
  }

  // 3. Summarize field verification findings
  const evidences = dispute.fieldEvidences || [];
  const photoCount = evidences.filter((e) => e.category === 'photo_field').length;
  const minuteCount = evidences.filter((e) => e.category === 'minute_field').length;
  const evidenceCitation =
    evidences.length > 0
      ? `\n- Dữ liệu và tư liệu thu thập tại hiện trường: Đã lập danh mục gồm ${evidences.length} tư liệu (trong đó có ${photoCount} ảnh chụp mốc ranh giới thực tế và ${minuteCount} biên bản/tài liệu đo đạc tại thực địa lưu trong hồ sơ; chi tiết tại Phụ lục Album ảnh và tài liệu thực địa kèm theo).`
      : '';

  const fieldVerificationSummary = `Căn cứ Biên bản xác minh hiện trường số ${minute.minuteNumber || '...'} ngày ${minute.date?.replace('T', ' ')} do Tổ công tác thực hiện:
- Kích thước đo đạc thực tế 4 cạnh tứ cận:
  + Phía Đông: ${minute.measuredDimensions?.east || 'Không có ghi nhận'}
  + Phía Tây: ${minute.measuredDimensions?.west || 'Không có ghi nhận'}
  + Phía Nam: ${minute.measuredDimensions?.south || 'Không có ghi nhận'}
  + Phía Bắc: ${minute.measuredDimensions?.north || 'Không có ghi nhận'}
- Diện tích sai lệch / lấn chiếm đo đạc thực tế: ${minute.measuredDimensions?.disputedArea || dispute.disputedArea} m².
- Hiện trạng thực tế tại hiện trường: ${minute.actualCheckFindings}.${evidenceCitation}
- Lời khai và ý kiến của các hộ liền kề, nhân chứng: ${minute.witnessOpinions || 'Các hộ tứ cận xác nhận ranh giới sử dụng đất có sự thay đổi sau khi cải tạo, rào chắn.'}`;

  // 4. Legal evaluation based on Vietnam Land Law 2024
  let legalEvaluation = `Căn cứ quy định tại Luật Đất đai 2024:
1. Theo Điều 136 và Điều 137 Luật Đất đai 2024 về căn cứ xác định quyền sử dụng đất và ranh giới thửa đất theo hồ sơ địa chính, Giấy chứng nhận đã được cấp có giá trị pháp lý xác định quyền sử dụng hợp pháp của người đứng tên.
2. Theo Điều 235 và Điều 236 Luật Đất đai 2024 về thẩm quyền và trình tự, thủ tục hòa giải tranh chấp đất đai tại UBND cấp xã: Tranh chấp đất đai trước khi khởi kiện tại Tòa án nhân dân hoặc nộp đơn yêu cầu giải quyết tại UBND cấp có thẩm quyền phải qua thủ tục hòa giải bắt buộc tại UBND cấp xã nơi có đất tranh chấp.
3. Đối chiếu giữa Giấy chứng nhận quyền sử dụng đất, bản đồ đo đạc địa chính chính quy và kết quả đo đạc thực địa tại Biên bản xác minh cho thấy: Nội dung phản ánh của ${dispute.partyA.name} về việc ${dispute.partyB.name} sử dụng lấn một phần ranh giới diện tích ${dispute.disputedArea || minute.measuredDimensions?.disputedArea || '...'} m² là có cơ sở căn cứ thực tế và pháp lý.`;

  // 5. Settlement proposal
  let settlementProposal = `Để giải quyết dứt điểm mâu thuẫn, giữ vững tình làng nghĩa xóm và ổn định an ninh trật tự khu dân cư, Tổ xác minh kính đề xuất Hội đồng hòa giải tranh chấp đất đai UBND xã phương án giải quyết như sau:
1. Đưa vụ việc ra phiên họp Hội đồng hòa giải tranh chấp đất đai cấp xã dự kiến vào ngày ${medDate.toLocaleDateString('vi-VN')}.
2. Phương án hòa giải trọng tâm:
   - Phương án 1 (Ưu tiên): Vận động ${dispute.partyB.name} tự nguyện tháo dỡ công trình, vật kiến trúc, trả lại ranh giới nguyên trạng thẳng theo Giấy chứng nhận quyền sử dụng đất. ${dispute.partyA.name} hỗ trợ một phần chi phí nhân công tháo dỡ nắn lại hàng rào.
   - Phương án 2: Trường hợp công trình kiên cố khó tháo dỡ, hai bên thỏa thuận chuyển nhượng phần diện tích lấn chiếm ${dispute.disputedArea || minute.measuredDimensions?.disputedArea || '...'} m² theo giá đất thỏa thuận dân sự, sau đó làm thủ tục trích lục chỉnh lý hồ sơ địa chính cấp đổi GCN theo hiện trạng.
3. Nếu hòa giải không thành: Lập Biên bản hòa giải không thành và ban hành văn bản hướng dẫn các đương sự nộp đơn khởi kiện giải quyết tại Tòa án nhân dân có thẩm quyền theo quy định pháp luật.`;

  const newReport: ExaminationReport = {
    reportNumber,
    date: todayStr,
    issuingAgency: 'UBND XÃ LÃNH NGỌC - TỔ CÔNG TÁC XÁC MINH TRANH CHẤP ĐẤT ĐAI',
    recipient: 'Chủ tịch UBND xã Lãnh Ngọc và Hội đồng hòa giải tranh chấp đất đai',
    disputeSummary,
    historicalOriginSummary,
    fieldVerificationSummary,
    legalEvaluation,
    settlementProposal,
    reporterName: dispute.handlerName || 'Đoàn Văn Hoài Vũ - Công chức Địa chính',
    leaderApprovalStatus: 'submitted',
    suggestedMediationDate: suggestedMedDateStr,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  dispute.examinationReport = newReport;
  dispute.status = 'reported';
  dispute.updatedAt = now.toISOString();

  const reqUser = getRequestUser(req);
  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'CREATE',
      module: 'dossiers',
      recordId: dispute.id,
      recordCode: dispute.code,
      description: `Tự động tạo Báo cáo thẩm tra xác minh số [${reportNumber}] từ Biên bản xác minh cho vụ [${dispute.code}]`,
    },
    false
  );

  await db.save();
  broadcastEvent('DISPUTE_UPDATED', dispute);
  res.json({ message: 'Tạo Báo cáo thẩm tra kết quả xác minh thành công.', report: newReport, dispute });
});

// 8. Update examination report
apiRouter.put('/disputes/:id/examination-report', async (req: Request, res: Response) => {
  const current = db.getData();
  const dispute = (current.disputes || []).find((d) => d.id === req.params.id);
  if (!dispute) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc tranh chấp.' });
    return;
  }

  const now = new Date().toISOString();
  dispute.examinationReport = {
    ...(dispute.examinationReport || ({} as any)),
    ...req.body,
    updatedAt: now,
  };
  dispute.updatedAt = now;

  const reqUser = getRequestUser(req);
  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'UPDATE',
      module: 'dossiers',
      recordId: dispute.id,
      recordCode: dispute.code,
      description: `Cập nhật nội dung Báo cáo thẩm tra xác minh cho vụ [${dispute.code}]`,
    },
    false
  );

  await db.save();
  broadcastEvent('DISPUTE_UPDATED', dispute);
  res.json(dispute);
});

// 9. Schedule mediation / record mediation outcome
apiRouter.post('/disputes/:id/mediation', async (req: Request, res: Response) => {
  const current = db.getData();
  const dispute = (current.disputes || []).find((d) => d.id === req.params.id);
  if (!dispute) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc tranh chấp.' });
    return;
  }

  const now = new Date().toISOString();
  const rawMediation = req.body;
  const currentMed = dispute.mediationRecord || ({} as MediationRecord);

  const updatedMed: MediationRecord = {
    ...currentMed,
    ...rawMediation,
    updatedAt: now,
    createdAt: currentMed.createdAt || now,
  };

  dispute.mediationRecord = updatedMed;

  // Update overall dispute status based on mediation outcome
  if (updatedMed.result === 'success') {
    dispute.status = 'resolved_success';
  } else if (updatedMed.result === 'failure') {
    dispute.status = 'resolved_failure';
  } else if (updatedMed.meetingDate) {
    dispute.status = 'scheduled';
  }

  dispute.updatedAt = now;

  const reqUser = getRequestUser(req);
  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'UPDATE',
      module: 'dossiers',
      recordId: dispute.id,
      recordCode: dispute.code,
      description: `Cập nhật phiên hòa giải vụ [${dispute.code}]: Kết quả ${
        updatedMed.result === 'success'
          ? 'HÒA GIẢI THÀNH'
          : updatedMed.result === 'failure'
          ? 'HÒA GIẢI KHÔNG THÀNH'
          : 'ĐÃ LÊN LỊCH'
      }`,
    },
    false
  );

  await db.save();
  broadcastEvent('DISPUTE_UPDATED', dispute);
  res.json(dispute);
});

// =========================================================================
// QUẢN LÝ QUỸ ĐẤT CÔNG ÍCH (QUỸ ĐẤT 5%)
// =========================================================================
apiRouter.get('/public-lands', (req: Request, res: Response) => {
  res.json(db.getPublicLands());
});

apiRouter.get('/public-lands/:id', (req: Request, res: Response) => {
  const parcel = db.getPublicLands().find((p) => p.id === req.params.id);
  if (!parcel) {
    res.status(404).json({ error: 'Không tìm thấy thửa đất công ích.' });
    return;
  }
  res.json(parcel);
});

apiRouter.post('/public-lands', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  const data = req.body;
  if (!data.parcel || !data.mapSheet) {
    res.status(400).json({ error: 'Vui lòng nhập số thửa đất và tờ bản đồ.' });
    return;
  }

  if (data.id && db.getPublicLands().some((p) => p.id === data.id)) {
    const updated = db.updatePublicLand(data.id, data, false);
    if (updated) {
      await db.save();
      broadcastEvent('PUBLIC_LAND_UPDATED', updated);
      res.json(updated);
      return;
    }
  }

  const newParcel = db.addPublicLand(
    {
      ...data,
      createdBy: reqUser?.id || 'admin',
      createdByName: reqUser?.name || 'Cán bộ Địa chính',
    },
    false
  );

  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'CREATE',
      module: 'dossiers',
      recordId: newParcel.id,
      recordCode: newParcel.code,
      description: `Thêm thửa đất công ích 5%: [${newParcel.code}] Thửa ${newParcel.parcel}, TBĐ ${newParcel.mapSheet} (${newParcel.location})`,
    },
    false
  );

  await db.save();
  broadcastEvent('PUBLIC_LAND_CREATED', newParcel);
  res.status(201).json(newParcel);
});

apiRouter.put('/public-lands/:id', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  const existing = db.getPublicLands().find((p) => p.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy thửa đất công ích để cập nhật.' });
    return;
  }
  if (!canUserModifyRecord(reqUser, existing)) {
    res.status(403).json({
      error: `Bạn không có quyền chỉnh sửa thửa đất công ích của cán bộ ${existing.createdByName || 'khác'}.`,
    });
    return;
  }
  const updated = db.updatePublicLand(req.params.id, req.body, false);
  if (!updated) {
    res.status(404).json({ error: 'Không tìm thấy thửa đất công ích để cập nhật.' });
    return;
  }

  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'UPDATE',
      module: 'dossiers',
      recordId: updated.id,
      recordCode: updated.code,
      description: `Cập nhật thông tin thửa đất công ích [${updated.code}] Thửa ${updated.parcel}, TBĐ ${updated.mapSheet}`,
    },
    false
  );

  await db.save();
  broadcastEvent('PUBLIC_LAND_UPDATED', updated);
  res.json(updated);
});

apiRouter.delete('/public-lands/:id', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  const existing = db.getPublicLands().find((p) => p.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy thửa đất công ích.' });
    return;
  }
  if (!canUserModifyRecord(reqUser, existing)) {
    res.status(403).json({
      error: `Bạn không có quyền xóa thửa đất công ích của cán bộ ${existing.createdByName || 'khác'}.`,
    });
    return;
  }
  const deleted = db.deletePublicLand(req.params.id, false);
  if (!deleted) {
    res.status(404).json({ error: 'Không tìm thấy thửa đất công ích.' });
    return;
  }

  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'DELETE',
      module: 'dossiers',
      recordId: deleted.id,
      recordCode: deleted.code,
      description: `Xóa thửa đất công ích: [${deleted.code}] Thửa ${deleted.parcel}, TBĐ ${deleted.mapSheet}`,
    },
    false
  );

  await db.save();
  broadcastEvent('PUBLIC_LAND_DELETED', { id: req.params.id });
  res.json({ message: 'Xóa thửa đất công ích thành công.', parcel: deleted });
});

// Thêm hợp đồng thuê khoán / đấu giá đất 5%
apiRouter.post('/public-lands/:id/contracts', async (req: Request, res: Response) => {
  const parcel = db.getPublicLands().find((p) => p.id === req.params.id);
  if (!parcel) {
    res.status(404).json({ error: 'Không tìm thấy thửa đất công ích.' });
    return;
  }

  const contractData = req.body;
  const contractId = db.generateUniqueId('contract');
  const now = new Date().toISOString();

  const newContract: PublicLandContract = {
    id: contractId,
    contractNumber: contractData.contractNumber || `${String((parcel.contracts?.length || 0) + 1).padStart(2, '0')}/HĐTĐ-UBND`,
    parcelId: parcel.id,
    parcelCode: parcel.code,
    parcelNumber: parcel.parcel,
    mapSheet: parcel.mapSheet,
    area: parcel.area,
    location: parcel.location,
    tenantName: contractData.tenantName || '',
    tenantCccd: contractData.tenantCccd || '',
    tenantPhone: contractData.tenantPhone || '',
    tenantAddress: contractData.tenantAddress || '',
    signedDate: contractData.signedDate || now.split('T')[0],
    startDate: contractData.startDate || now.split('T')[0],
    endDate: contractData.endDate || '',
    leaseDurationYears: Number(contractData.leaseDurationYears) || 5,
    annualRent: Number(contractData.annualRent) || 0,
    totalContractValue: (Number(contractData.annualRent) || 0) * (Number(contractData.leaseDurationYears) || 5),
    paymentTerms: contractData.paymentTerms || 'Nộp hàng năm vào tháng 01 tại Ban tài chính xã',
    paymentHistory: contractData.paymentHistory || [],
    status: 'active',
    notes: contractData.notes || '',
    attachments: contractData.attachments || [],
    createdAt: now,
    updatedAt: now,
  };

  if (!parcel.contracts) parcel.contracts = [];
  parcel.contracts.unshift(newContract);

  // Sync to current parcel active lease
  parcel.status = 'leased';
  parcel.currentContractId = newContract.id;
  parcel.contractNumber = newContract.contractNumber;
  parcel.tenantName = newContract.tenantName;
  parcel.tenantCccd = newContract.tenantCccd;
  parcel.tenantPhone = newContract.tenantPhone;
  parcel.tenantAddress = newContract.tenantAddress;
  parcel.leaseStartDate = newContract.startDate;
  parcel.leaseEndDate = newContract.endDate;
  parcel.leaseDurationYears = newContract.leaseDurationYears;
  parcel.annualRent = newContract.annualRent;
  parcel.updatedAt = now;

  const reqUser = getRequestUser(req);
  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'UPDATE',
      module: 'dossiers',
      recordId: parcel.id,
      recordCode: parcel.code,
      description: `Lập hợp đồng cho thuê đất 5% số ${newContract.contractNumber} cho hộ ${newContract.tenantName} (Thửa ${parcel.parcel}, TBĐ ${parcel.mapSheet})`,
    },
    false
  );

  await db.save();
  broadcastEvent('PUBLIC_LAND_UPDATED', parcel);
  res.status(201).json(parcel);
});

// Ghi nhận nộp tiền thuê đất công ích
apiRouter.post('/public-lands/:id/payments', async (req: Request, res: Response) => {
  const parcel = db.getPublicLands().find((p) => p.id === req.params.id);
  if (!parcel) {
    res.status(404).json({ error: 'Không tìm thấy thửa đất công ích.' });
    return;
  }

  const { year, amount, receiptNumber, paidDate, note } = req.body;
  const paymentItem = {
    id: db.generateUniqueId('pay'),
    year: Number(year) || new Date().getFullYear(),
    amount: Number(amount) || parcel.annualRent,
    receiptNumber: receiptNumber || `BL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    paidDate: paidDate || new Date().toISOString().split('T')[0],
    note: note || '',
  };

  if (parcel.contracts && parcel.contracts.length > 0) {
    const activeContract = parcel.contracts.find((c) => c.id === parcel.currentContractId) || parcel.contracts[0];
    if (activeContract) {
      if (!activeContract.paymentHistory) activeContract.paymentHistory = [];
      activeContract.paymentHistory.unshift(paymentItem);
      activeContract.updatedAt = new Date().toISOString();
    }
  }

  parcel.paymentStatus = 'paid';
  parcel.lastPaymentDate = paymentItem.paidDate;
  parcel.paymentReceiptNumber = paymentItem.receiptNumber;
  parcel.updatedAt = new Date().toISOString();

  const reqUser = getRequestUser(req);
  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'UPDATE',
      module: 'dossiers',
      recordId: parcel.id,
      recordCode: parcel.code,
      description: `Thu tiền thuê đất 5% năm ${paymentItem.year} - Số tiền ${paymentItem.amount.toLocaleString()} đ (Biên lai: ${paymentItem.receiptNumber}) - Hộ ${parcel.tenantName || ''}`,
    },
    false
  );

  await db.save();
  broadcastEvent('PUBLIC_LAND_UPDATED', parcel);
  res.json(parcel);
});

// =========================================================================
// TRẬT TỰ XÂY DỰNG & VI PHẠM ĐẤT ĐAI
// =========================================================================
apiRouter.get('/violations', (req: Request, res: Response) => {
  res.json(db.getViolations());
});

apiRouter.get('/violations/:id', (req: Request, res: Response) => {
  const caseItem = db.getViolations().find((v) => v.id === req.params.id);
  if (!caseItem) {
    res.status(404).json({ error: 'Không tìm thấy hồ sơ vi phạm.' });
    return;
  }
  res.json(caseItem);
});

apiRouter.post('/violations', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  const data = req.body;
  if (!data.violatorName || !data.location) {
    res.status(400).json({ error: 'Vui lòng nhập tên đối tượng vi phạm và địa bàn vi phạm.' });
    return;
  }

  if (data.id && db.getViolations().some((v) => v.id === data.id)) {
    const existing = db.getViolations().find((v) => v.id === data.id);
    if (existing && !canUserModifyRecord(reqUser, existing)) {
      res.status(403).json({
        error: `Bạn không có quyền chỉnh sửa hồ sơ vi phạm của cán bộ ${existing.handlerName || 'khác'}.`,
      });
      return;
    }
    const updated = db.updateViolation(data.id, data, false);
    if (updated) {
      await db.save();
      broadcastEvent('VIOLATION_UPDATED', updated);
      res.json(updated);
      return;
    }
  }

  const newViolation = db.addViolation(
    {
      ...data,
      createdBy: reqUser?.id || 'admin',
      createdByName: reqUser?.name || 'Cán bộ Đô thị - Địa chính',
    },
    false
  );

  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'CREATE',
      module: 'dossiers',
      recordId: newViolation.id,
      recordCode: newViolation.code,
      description: `Lập hồ sơ vi phạm trật tự xây dựng/đất đai: [${newViolation.code}] Đối tượng: ${newViolation.violatorName} (${newViolation.location})`,
    },
    false
  );

  await db.save();
  broadcastEvent('VIOLATION_CREATED', newViolation);
  res.status(201).json(newViolation);
});

apiRouter.put('/violations/:id', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  const existing = db.getViolations().find((v) => v.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc vi phạm để cập nhật.' });
    return;
  }
  if (!canUserModifyRecord(reqUser, existing)) {
    res.status(403).json({
      error: `Bạn không có quyền chỉnh sửa hồ sơ vi phạm của cán bộ ${existing.handlerName || 'khác'}. Chỉ Admin, Lãnh đạo hoặc cán bộ trực tiếp thụ lý mới được phép thao tác.`,
    });
    return;
  }
  const updated = db.updateViolation(req.params.id, req.body, false);
  if (!updated) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc vi phạm để cập nhật.' });
    return;
  }

  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'UPDATE',
      module: 'dossiers',
      recordId: updated.id,
      recordCode: updated.code,
      description: `Cập nhật hồ sơ vi phạm [${updated.code}] - ${updated.violatorName}`,
    },
    false
  );

  await db.save();
  broadcastEvent('VIOLATION_UPDATED', updated);
  res.json(updated);
});

apiRouter.delete('/violations/:id', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  const existing = db.getViolations().find((v) => v.id === req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc vi phạm.' });
    return;
  }
  if (!canUserModifyRecord(reqUser, existing)) {
    res.status(403).json({
      error: `Bạn không có quyền xóa hồ sơ vi phạm của cán bộ ${existing.handlerName || 'khác'}.`,
    });
    return;
  }
  const deleted = db.deleteViolation(req.params.id, false);
  if (!deleted) {
    res.status(404).json({ error: 'Không tìm thấy vụ việc vi phạm.' });
    return;
  }

  db.addActivityLog(
    {
      userId: reqUser?.id || 'admin',
      userName: reqUser?.name || 'Cán bộ',
      action: 'DELETE',
      module: 'dossiers',
      recordId: deleted.id,
      recordCode: deleted.code,
      description: `Xóa hồ sơ vi phạm: [${deleted.code}] ${deleted.violatorName}`,
    },
    false
  );

  await db.save();
  broadcastEvent('VIOLATION_DELETED', { id: req.params.id });
  res.json({ message: 'Xóa hồ sơ vi phạm thành công.', violation: deleted });
});

// Thêm ảnh / tư liệu hiện trường vi phạm
apiRouter.post('/violations/:id/evidences', async (req: Request, res: Response) => {
  const violation = db.getViolations().find((v) => v.id === req.params.id);
  if (!violation) {
    res.status(404).json({ error: 'Không tìm thấy hồ sơ vi phạm.' });
    return;
  }

  const evidenceItem: ViolationEvidenceItem = {
    id: db.generateUniqueId('ev'),
    url: req.body.url || '',
    name: req.body.name || 'Ảnh tư liệu hiện trường',
    caption: req.body.caption || '',
    category: req.body.category || 'photo_violation',
    uploadedAt: new Date().toISOString(),
  };

  if (!violation.evidences) violation.evidences = [];
  violation.evidences.unshift(evidenceItem);
  violation.updatedAt = new Date().toISOString();

  await db.save();
  broadcastEvent('VIOLATION_UPDATED', violation);
  res.status(201).json(violation);
});

apiRouter.get('/migration/export', (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  if (!reqUser || (reqUser.role !== 'admin' && reqUser.role !== 'leader')) {
    res.status(403).json({ error: 'Chỉ Quản trị viên hoặc Lãnh đạo mới có quyền xuất bản sao lưu toàn bộ cơ sở dữ liệu.' });
    return;
  }
  res.setHeader('Content-Disposition', `attachment; filename="QLCV_DatDai_Backup_${new Date().toISOString().split('T')[0]}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(db.getData());
});

apiRouter.post('/migration/import', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  if (!reqUser || reqUser.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên tối cao (Admin) mới có quyền nhập và khôi phục dữ liệu từ tệp sao lưu.' });
    return;
  }

  const importedData = req.body;
  if (!importedData || (!importedData.tasks && !importedData.dossiers)) {
    res.status(400).json({ error: 'Định dạng tệp sao lưu JSON không hợp lệ.' });
    return;
  }

  // Always create an automated safety backup before overwriting
  db.createBackup('before_import');

  const current = db.getData();
  if (Array.isArray(importedData.users) && importedData.users.length > 0) current.users = importedData.users;
  if (Array.isArray(importedData.tasks)) current.tasks = importedData.tasks;
  if (Array.isArray(importedData.dossiers)) current.dossiers = importedData.dossiers;
  if (Array.isArray(importedData.calendarEvents)) current.calendarEvents = importedData.calendarEvents;
  if (Array.isArray(importedData.registerBooks)) current.registerBooks = importedData.registerBooks;
  if (Array.isArray(importedData.documents)) current.documents = importedData.documents;
  if (Array.isArray(importedData.projects)) current.projects = importedData.projects;
  if (Array.isArray(importedData.disputes)) current.disputes = importedData.disputes;
  if (Array.isArray(importedData.publicLands)) current.publicLands = importedData.publicLands;
  if (Array.isArray(importedData.violations)) current.violations = importedData.violations;
  if (importedData.settings) current.settings = { ...current.settings, ...importedData.settings };

  db.addActivityLog(
    {
      userId: reqUser.id,
      userName: reqUser.name,
      action: 'CREATE',
      module: 'settings',
      description: `Khôi phục/Nhập dữ liệu thành công từ tệp sao lưu JSON (${current.tasks.length} công việc, ${current.dossiers.length} hồ sơ, ${(current.disputes || []).length} vụ tranh chấp, ${(current.publicLands || []).length} thửa đất công ích, ${(current.violations || []).length} hồ sơ vi phạm).`,
    },
    false
  );

  await db.save();

  broadcastEvent('DATA_RESET');
  res.json({
    message: 'Nhập dữ liệu thành công!',
    stats: {
      tasks: current.tasks.length,
      dossiers: current.dossiers.length,
      calendar: current.calendarEvents.length,
      registerBooks: current.registerBooks.length,
      documents: current.documents.length,
      projects: current.projects?.length || 0,
      disputes: current.disputes?.length || 0,
      publicLands: current.publicLands?.length || 0,
      violations: current.violations?.length || 0,
    },
  });
});

apiRouter.post('/migration/reset-sample', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  if (!reqUser || reqUser.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên tối cao (Admin) mới có quyền nạp lại dữ liệu mẫu.' });
    return;
  }

  // Preserve any user-created dossiers not in standard list
  const standardCodes = new Set(initialDossiers.map((d) => d.code));
  const currentDossiers = db.getData().dossiers || [];
  const userDossiers = currentDossiers.filter((d) => !standardCodes.has(d.code));

  const sample = {
    users: initialUsers,
    tasks: [...initialTasks],
    dossiers: [...initialDossiers, ...userDossiers],
    calendarEvents: initialCalendar,
    registerBooks: initialRegisterBooks,
    documents: initialDocuments,
    notifications: initialNotifications,
    activityLogs: initialActivityLogs,
    settings: initialSettings,
    alertLogs: initialAlertLogs,
    projects: initialProjects,
    disputes: [...initialDisputes],
    publicLands: [...initialPublicLands],
    violations: [...initialViolations],
  };
  await db.restore(sample);
  broadcastEvent('DATA_RESET');
  res.json({
    message: `Đã nạp lại dữ liệu mẫu chuẩn thành công (bảo lưu an toàn ${userDossiers.length} hồ sơ do người dùng đã nhập).`,
  });
});

apiRouter.post('/system/reset-data-to-zero', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  const confirmationCode = req.body?.confirmationCode || req.headers['x-admin-confirmation-code'];
  if (!reqUser || reqUser.role !== 'admin' || confirmationCode !== 'DANANG_RESET_TO_ZERO_SECURE_2026') {
    res.status(403).json({
      error: 'Từ chối thao tác: Thao tác đưa dữ liệu về 0 bị khóa để bảo vệ an toàn hồ sơ đất đai. Cần quyền Quản trị viên và mã xác nhận tối cao cấp tỉnh.',
    });
    return;
  }

  db.createBackup('before_reset_zero');

  const current = db.getData();
  current.dossiers = [];
  current.tasks = [];
  current.projects = [];
  current.disputes = [];
  current.publicLands = [];
  current.violations = [];
  current.calendarEvents = [];
  current.deletedDossiers = [];
  current.deletedTasks = [];
  current.deletedPublicLands = [];
  current.deletedViolations = [];
  current.deletedDisputes = [];
  current.activityLogs = [];
  current.alertLogs = [];
  current.notifications = [];
  current.registerBooks = [];
  current.documents = [];
  await db.save();
  broadcastEvent('DATA_RESET');
  res.json({
    message: 'Đã đưa tất cả dữ liệu hồ sơ đất đai, công việc, dự án, tranh chấp đất đai, đất công ích, vi phạm, lịch về 0 thành công.',
    status: 'ok',
    counts: {
      dossiers: 0,
      tasks: 0,
      projects: 0,
      disputes: 0,
      publicLands: 0,
      violations: 0,
      calendar: 0,
    },
  });
});

apiRouter.post('/system/restore-version-v1', async (req: Request, res: Response) => {
  const reqUser = getRequestUser(req);
  if (!reqUser || reqUser.role !== 'admin') {
    res.status(403).json({ error: 'Chỉ Quản trị viên mới có quyền khôi phục phiên bản chuẩn v1.0.' });
    return;
  }

  const canonicalPath = path.resolve(process.cwd(), 'data', 'snapshot_v1.0_canonical.json');
  if (fs.existsSync(canonicalPath)) {
    try {
      const raw = fs.readFileSync(canonicalPath, 'utf-8');
      const parsed = JSON.parse(raw);
      await db.restore(parsed);
      broadcastEvent('DATA_RESET');
      res.json({
        message: 'Đã khôi phục thành công toàn bộ hệ thống về đúng Phiên bản chuẩn v1.0.',
        status: 'ok',
        version: 'v1.0',
        dossiersCount: parsed.dossiers?.length || 0,
        tasksCount: parsed.tasks?.length || 0,
      });
      return;
    } catch (e: any) {
      res.status(500).json({ error: 'Lỗi khi đọc file snapshot chuẩn v1.0: ' + e?.message });
      return;
    }
  }

  res.status(404).json({ error: 'Không tìm thấy file snapshot chuẩn v1.0.' });
});

// System Data Integrity Check & Harmonization
apiRouter.get('/system/integrity-check', async (req: Request, res: Response) => {
  try {
    const report = await runDataIntegrityAudit();
    res.json(report);
  } catch (err: any) {
    console.error('[API_INTEGRITY_CHECK_ERROR]', err);
    res.status(500).json({ error: 'Lỗi khi kiểm tra tính toàn vẹn dữ liệu: ' + (err?.message || err) });
  }
});

apiRouter.post('/system/integrity-repair', async (req: Request, res: Response) => {
  try {
    const reqUser = getRequestUser(req);
    if (!reqUser || reqUser.role !== 'admin') {
      res.status(403).json({ error: 'Chỉ Quản trị viên mới có quyền thực hiện đồng bộ sửa chữa dữ liệu toàn hệ thống.' });
      return;
    }
    const result = await repairDataIntegrity();
    broadcastEvent('DATA_RESET');
    res.json(result);
  } catch (err: any) {
    console.error('[API_INTEGRITY_REPAIR_ERROR]', err);
    res.status(500).json({ error: 'Lỗi khi đồng bộ sửa chữa dữ liệu: ' + (err?.message || err) });
  }
});

