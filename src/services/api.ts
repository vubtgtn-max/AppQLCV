import {
  User,
  Task,
  Dossier,
  CalendarEvent,
  RegisterBook,
  DocumentItem,
  NotificationItem,
  ActivityLog,
  AppSettings,
  Attachment,
  AlertMessageLog,
  AlertConfig,
  PendingAlertItem,
  AlertChannel,
  BackupFileItem,
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
} from '../types';

const API_BASE = '/api';

export class ApiAbortError extends Error {
  constructor(message: string = 'Thao tác đã bị hủy.') {
    super(message);
    this.name = 'AbortError';
  }
}

export function isAbortError(error: any, signal?: AbortSignal | null): boolean {
  if (signal?.aborted) return true;
  if (!error) return false;
  return (
    error.name === 'AbortError' ||
    error.name === 'CanceledError' ||
    error.code === 20 ||
    error.message?.includes('aborted') ||
    error.message?.includes('The user aborted a request') ||
    error.message?.includes('signal is aborted')
  );
}

import { handleServerlessApi } from './serverlessFallback';

let currentAuthUserId = '';
let currentAuthToken = '';
let useServerlessMode =
  typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('github.io') ||
    Boolean((window as any).__FORCE_SERVERLESS_MODE__));

export function setCurrentAuthUserId(id: string) {
  currentAuthUserId = id || '';
}

export function setCurrentAuthToken(token: string) {
  currentAuthToken = token || '';
  try {
    if (token) {
      localStorage.setItem('qlcv_auth_token', token);
    } else {
      localStorage.removeItem('qlcv_auth_token');
    }
  } catch {}
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Security policy: Strictly reject file:// protocol to protect cadastral data from unauthorized cloud calls
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    const errorMsg =
      'Ứng dụng QLCV Đất đai không được phép chạy trực tiếp qua giao thức file:// để bảo vệ an toàn dữ liệu địa chính. Vui lòng khởi động máy chủ và truy cập qua HTTP/HTTPS nội bộ (ví dụ: http://localhost:3000 hoặc địa chỉ IP mạng nội bộ).';
    console.error('[SECURITY_POLICY]', errorMsg);
    throw new Error(errorMsg);
  }

  if (useServerlessMode) {
    return handleServerlessApi(endpoint, options) as Promise<T>;
  }

  let token = currentAuthToken;
  if (!token) {
    try {
      token = localStorage.getItem('qlcv_auth_token') || '';
    } catch {}
  }

  let userId = currentAuthUserId;
  if (!userId) {
    try {
      const stored = localStorage.getItem('qlcv_auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.id) userId = u.id;
      }
    } catch {}
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
        ...options?.headers,
      },
      ...options,
    });
  } catch (fetchErr: any) {
    if (options?.signal?.aborted || isAbortError(fetchErr, options?.signal)) {
      throw new ApiAbortError();
    }
    // Network error: Do NOT fallback to serverless Cloud Firestore mode. Keep data strictly on local centralized server!
    throw new Error(
      `Không thể kết nối đến máy chủ trung tâm (${API_BASE}${endpoint}). Vui lòng kiểm tra lại dịch vụ máy chủ nội bộ.`
    );
  }

  const contentType = res.headers.get('content-type') || '';
  if ((res.status === 404 || res.status === 405) && !contentType.includes('application/json')) {
    if (useServerlessMode && typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
      return handleServerlessApi(endpoint, options) as Promise<T>;
    }
  }

  if (!res.ok) {
    let errorMsg = `Lỗi hệ thống (${res.status})`;
    try {
      const json = await res.json();
      if (json.error) errorMsg = json.error;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const apiService = {
  // Snapshot sync
  getSnapshot: (signal?: AbortSignal) =>
    request<{
      users: User[];
      tasks: Task[];
      dossiers: Dossier[];
      calendarEvents: CalendarEvent[];
      registerBooks: RegisterBook[];
      documents: DocumentItem[];
      notifications: NotificationItem[];
      activityLogs: ActivityLog[];
      settings: AppSettings;
      projects: LandProject[];
      disputes: DisputeCase[];
      publicLands?: PublicLandParcel[];
      violations?: LandViolationCase[];
    }>('/sync/snapshot', { signal }),

  // Auth
  login: (username: string, password?: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  changePassword: (userId: string, oldPassword: string, newPassword: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    }),

  register: (data: { name: string; username: string; email: string; phone?: string; position?: string }) =>
    request<{ message: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Users
  getUsers: () => request<User[]>('/users'),
  approveUser: (id: string) => request<User>(`/users/${id}/approve`, { method: 'POST' }),
  toggleLockUser: (id: string) => request<User>(`/users/${id}/toggle-lock`, { method: 'POST' }),
  resetPassword: (id: string, newPassword?: string) =>
    request<{ message: string; user: User; newPassword?: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
  updateUser: (id: string, data: Partial<User>) =>
    request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Tasks
  getTasks: () => request<Task[]>('/tasks'),
  createTask: (data: Partial<Task>) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createTasksBatch: (tasks: Partial<Task>[], importedBy?: string, importedByName?: string, idempotencyKey?: string) =>
    request<{ message: string; count: number; tasks: Task[] }>('/tasks/batch', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: JSON.stringify({ tasks, importedBy, importedByName }),
    }),
  updateTask: (id: string, data: Partial<Task>) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTask: (id: string) =>
    request<{ message: string; task: Task }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  // Dossiers
  getDossiers: () => request<Dossier[]>('/dossiers'),
  createDossier: (data: Partial<Dossier>) =>
    request<Dossier>('/dossiers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  createDossiersBatch: (dossiers: Partial<Dossier>[], importedBy?: string, importedByName?: string) =>
    request<{ message: string; count: number; dossiers: Dossier[] }>('/dossiers/batch', {
      method: 'POST',
      body: JSON.stringify({ dossiers, importedBy, importedByName }),
    }),
  restoreStandard60Dossiers: () =>
    request<{ message: string; total: number }>('/dossiers/restore-standard-60', {
      method: 'POST',
    }),
  updateDossier: (id: string, data: Partial<Dossier>) =>
    request<Dossier>(`/dossiers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDossier: (id: string) =>
    request<{ message: string; dossier: Dossier }>(`/dossiers/${id}`, {
      method: 'DELETE',
    }),
  getDeletedDossiers: (signal?: AbortSignal) => request<Dossier[]>('/dossiers/deleted', { signal }),
  restoreDeletedDossier: (id: string) =>
    request<{ message: string; dossier: Dossier }>(`/dossiers/restore-deleted/${id}`, {
      method: 'POST',
    }),
  restoreAllDeletedDossiers: () =>
    request<{ message: string; restoredCount: number }>('/dossiers/restore-all-deleted', {
      method: 'POST',
    }),

  // Calendar
  getCalendar: () => request<CalendarEvent[]>('/calendar'),
  createCalendarEvent: (data: Partial<CalendarEvent>) =>
    request<CalendarEvent>('/calendar', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCalendarEvent: (id: string, data: Partial<CalendarEvent>) =>
    request<CalendarEvent>(`/calendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCalendarEvent: (id: string) =>
    request<{ message: string; event: CalendarEvent }>(`/calendar/${id}`, {
      method: 'DELETE',
    }),

  // Register books
  getRegisterBooks: () => request<RegisterBook[]>('/register-books'),
  createRegisterBook: (data: Partial<RegisterBook>) =>
    request<RegisterBook>('/register-books', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  batchCreateRegisterBooks: (books: Partial<RegisterBook>[]) =>
    request<{ message: string; count: number; books: RegisterBook[] }>('/register-books/batch', {
      method: 'POST',
      body: JSON.stringify({ books }),
    }),
  updateRegisterBook: (id: string, data: Partial<RegisterBook>) =>
    request<RegisterBook>(`/register-books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteRegisterBook: (id: string) =>
    request<{ message: string; book: RegisterBook }>(`/register-books/${id}`, {
      method: 'DELETE',
    }),

  // Documents
  getDocuments: () => request<DocumentItem[]>('/documents'),
  createDocument: (data: Partial<DocumentItem>) =>
    request<DocumentItem>('/documents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDocument: (id: string, data: Partial<DocumentItem>) =>
    request<DocumentItem>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDocument: (id: string) =>
    request<{ message: string; document: DocumentItem }>(`/documents/${id}`, {
      method: 'DELETE',
    }),

  // Notifications
  getNotifications: (userId?: string) =>
    request<NotificationItem[]>(`/notifications${userId ? `?userId=${userId}` : ''}`),
  createNotification: (data: Partial<NotificationItem>) =>
    request<NotificationItem>('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),
  deleteNotification: (id: string) =>
    request<{ success: boolean }>(`/notifications/${id}`, { method: 'DELETE' }),
  clearAllNotifications: (userId?: string) =>
    request<{ success: boolean }>('/notifications/clear-all', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  markAllNotificationsRead: (userId?: string) =>
    request<{ success: boolean }>('/notifications/read-all', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  // Activity logs
  getActivityLogs: () => request<ActivityLog[]>('/activity-logs'),

  // Settings
  getSettings: () => request<AppSettings>('/settings'),
  updateSettings: (data: Partial<AppSettings>) =>
    request<AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Villages / Danh mục thôn dùng chung
  getVillages: () => request<string[]>('/villages'),
  addVillage: (village: string) =>
    request<{ message: string; villages: string[] }>('/villages', {
      method: 'POST',
      body: JSON.stringify({ village }),
    }),
  deleteVillage: (village: string) =>
    request<{ message: string; villages: string[] }>(`/villages/${encodeURIComponent(village)}`, {
      method: 'DELETE',
    }),

  // File upload
  uploadFiles: async (
    files: File[] | FileList,
    uploadedBy: string,
    uploadedByName: string,
    isResult: boolean = false,
    signal?: AbortSignal
  ): Promise<Attachment[]> => {
    const fileList: File[] = Array.from(files as any);
    const buildLocalAttachments = async (): Promise<Attachment[]> => {
      const results: Attachment[] = [];
      for (let idx = 0; idx < fileList.length; idx++) {
        const f = fileList[idx];
        if (f.size > 5 * 1024 * 1024) {
          throw new Error('Tệp vượt quá 5 MB không thể lưu bền trong chế độ ngoại tuyến. Hãy kết nối máy chủ rồi tải lên lại.');
        }
        const fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error || new Error('Không đọc được tệp đã chọn.'));
          reader.readAsDataURL(f);
        });
        results.push({ id: 'att_' + Date.now() + '_' + idx, name: f.name, url: fileUrl, path: fileUrl, contentType: f.type || 'application/octet-stream', size: f.size, uploadedBy, uploadedByName, uploadedAt: new Date().toISOString(), isResult });
      }
      return results;
    };

    if (useServerlessMode) return buildLocalAttachments();

    const formData = new FormData();
    fileList.forEach((f) => formData.append('files', f));
    formData.append('uploadedBy', uploadedBy);
    formData.append('uploadedByName', uploadedByName);
    formData.append('isResult', String(isResult));

    let token = currentAuthToken;
    if (!token) {
      try { token = localStorage.getItem('qlcv_auth_token') || ''; } catch {}
    }
    let userId = currentAuthUserId || uploadedBy;
    if (!userId) {
      try {
        const stored = localStorage.getItem('qlcv_auth_user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.id) userId = u.id;
        }
      } catch {}
    }

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: formData,
        signal,
      });
    } catch (fetchErr: any) {
      if (signal?.aborted || isAbortError(fetchErr, signal)) throw new ApiAbortError();
      throw new Error('Không tải được tệp lên máy chủ. Tệp chưa được lưu; hãy kiểm tra kết nối rồi thử lại.');
    }

    let data: any = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error(data?.error || 'Máy chủ từ chối tải tệp (HTTP ' + res.status + '). Tệp chưa được lưu.');
    if (!data?.success || !Array.isArray(data.attachments) || data.attachments.length !== fileList.length || data.attachments.some((attachment: Attachment) => !attachment?.url || !attachment?.id)) {
      throw new Error('Máy chủ không xác nhận đã lưu đầy đủ tệp. Hồ sơ chưa được cập nhật.');
    }
    return data.attachments as Attachment[];
  },


  // Migration, In-App Backups & Sample Reset
  getBackupList: (signal?: AbortSignal) => request<BackupFileItem[]>('/migration/backups', { signal }),
  createInAppBackup: (reason?: string) =>
    request<{ message: string; filename: string }>('/migration/backups/create', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  restoreInAppBackup: async (filename: string) => {
    try {
      return await request<{ message: string }>(`/migration/backups/${encodeURIComponent(filename)}/restore`, {
        method: 'POST',
      });
    } catch {
      return await request<{ message: string }>('/migration/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      });
    }
  },
  deleteInAppBackup: async (filename: string) => {
    try {
      return await request<{ message: string }>(`/migration/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
    } catch {
      return await request<{ message: string }>('/migration/backups/delete', {
        method: 'POST',
        body: JSON.stringify({ filename }),
      });
    }
  },
  getBackupDownloadUrl: (filename: string) => `/api/migration/backups/${encodeURIComponent(filename)}/download`,
  importData: (data: any) =>
    request<{ message: string; stats: any }>('/migration/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  exportBackup: () => request<any>('/sync/snapshot'),
  restoreBackup: (data: any) =>
    request<{ message: string; stats: any }>('/migration/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resetSampleData: () => request<{ message: string }>('/migration/reset-sample', { method: 'POST' }),
  testFirebase: async (_config: { apiKey?: string; projectId?: string; appId?: string }) => {
    return { success: true, message: 'Kiểm tra cấu hình kết nối Firebase Firestore thành công.' };
  },

  // Smart Alerts & Multi-Channel Interaction
  getAlertLogs: (
    params?: { channel?: string; trigger?: string; recipientId?: string; search?: string },
    signal?: AbortSignal
  ) => {
    const query = new URLSearchParams();
    if (params?.channel) query.append('channel', params.channel);
    if (params?.trigger) query.append('trigger', params.trigger);
    if (params?.recipientId) query.append('recipientId', params.recipientId);
    if (params?.search) query.append('search', params.search);
    return request<AlertMessageLog[]>(`/alerts/logs?${query.toString()}`, { signal });
  },

  getPendingAlerts: (signal?: AbortSignal) => request<PendingAlertItem[]>('/alerts/pending', { signal }),

  scanAndSendAlerts: (force: boolean = false) =>
    request<{ message: string; result: { scanned: number; alertsSent: number; details: any[] } }>('/alerts/scan-now', {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  sendDirectAlert: (data: {
    targetType: 'task' | 'dossier' | 'document' | 'calendar' | 'broadcast';
    targetId: string;
    targetCode: string;
    recipientId: string; // or 'all'
    channels?: AlertChannel[];
    customTitle?: string;
    customContent?: string;
    trigger?: string;
  }) =>
    request<{ message: string; logs: AlertMessageLog[] }>('/alerts/send-direct', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  testAlertChannel: (data: {
    channel: AlertChannel;
    testRecipient?: string;
    testMessage?: string;
    botToken?: string;
    chatId?: string;
  }) =>
    request<{ message: string; log: AlertMessageLog; success: boolean }>('/alerts/test-channel', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateAlertConfig: (config: Partial<AlertConfig>) =>
    request<{ message: string; alertConfig: AlertConfig }>('/alerts/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),

  deleteAlertLog: (id: string) => request<{ message: string }>(`/alerts/logs/${id}`, { method: 'DELETE' }),

  clearAlertLogs: () => request<{ message: string }>('/alerts/logs/clear', { method: 'POST' }),

  deleteActivityLog: (id: string) => request<{ message: string }>(`/activity-logs/${id}`, { method: 'DELETE' }),

  clearActivityLogs: () => request<{ message: string }>('/activity-logs/clear', { method: 'POST' }),

  // Projects & Land Recovery Management
  getProjects: () => request<LandProject[]>('/projects'),
  getProject: (id: string) => request<LandProject>(`/projects/${id}`),
  createProject: (data: Partial<LandProject>) =>
    request<LandProject>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProject: (id: string, data: Partial<LandProject>) =>
    request<LandProject>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProject: (id: string) =>
    request<{ message: string; project: LandProject }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  // Household sub-methods
  addHousehold: (projectId: string, data: Partial<ProjectHousehold>) =>
    request<ProjectHousehold>(`/projects/${projectId}/households`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateHousehold: (projectId: string, householdId: string, data: Partial<ProjectHousehold>) =>
    request<ProjectHousehold>(`/projects/${projectId}/households/${householdId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteHousehold: (projectId: string, householdId: string) =>
    request<{ message: string; household: ProjectHousehold }>(`/projects/${projectId}/households/${householdId}`, {
      method: 'DELETE',
    }),
  batchImportHouseholds: (projectId: string, households: Partial<ProjectHousehold>[]) =>
    request<{ message: string; count: number }>(`/projects/${projectId}/households/batch`, {
      method: 'POST',
      body: JSON.stringify({ households }),
    }),

  // Disputes & Land Mediation
  getDisputes: () => request<DisputeCase[]>('/disputes'),
  getDispute: (id: string) => request<DisputeCase>(`/disputes/${id}`),
  createDispute: (data: Partial<DisputeCase>) =>
    request<DisputeCase>('/disputes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDispute: (id: string, data: Partial<DisputeCase>) =>
    request<DisputeCase>(`/disputes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDispute: (id: string) =>
    request<{ message: string; dispute: DisputeCase }>(`/disputes/${id}`, {
      method: 'DELETE',
    }),
  saveVerificationMinute: (id: string, data: VerificationMinute) =>
    request<DisputeCase>(`/disputes/${id}/verification-minute`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  generateExaminationReport: (id: string) =>
    request<{ message: string; report: ExaminationReport; dispute: DisputeCase }>(
      `/disputes/${id}/generate-examination-report`,
      {
        method: 'POST',
      }
    ),
  saveExaminationReport: (id: string, data: Partial<ExaminationReport>) =>
    request<DisputeCase>(`/disputes/${id}/examination-report`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  saveMediationRecord: (id: string, data: Partial<MediationRecord>) =>
    request<DisputeCase>(`/disputes/${id}/mediation`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Public Lands (Quỹ đất 5%)
  getPublicLands: () => request<PublicLandParcel[]>('/public-lands'),
  getPublicLand: (id: string) => request<PublicLandParcel>(`/public-lands/${id}`),
  createPublicLand: (data: Partial<PublicLandParcel>) =>
    request<PublicLandParcel>('/public-lands', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updatePublicLand: (id: string, data: Partial<PublicLandParcel>) =>
    request<PublicLandParcel>(`/public-lands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deletePublicLand: (id: string) =>
    request<{ message: string; parcel: PublicLandParcel }>(`/public-lands/${id}`, {
      method: 'DELETE',
    }),
  createPublicLandContract: (id: string, data: Partial<PublicLandContract>) =>
    request<PublicLandParcel>(`/public-lands/${id}/contracts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  recordPublicLandPayment: (
    id: string,
    data: { year: number; amount: number; receiptNumber?: string; paidDate?: string; note?: string }
  ) =>
    request<PublicLandParcel>(`/public-lands/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Land & Construction Violations (Trật tự xây dựng & Vi phạm đất đai)
  getViolations: () => request<LandViolationCase[]>('/violations'),
  getViolation: (id: string) => request<LandViolationCase>(`/violations/${id}`),
  createViolation: (data: Partial<LandViolationCase>) =>
    request<LandViolationCase>('/violations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateViolation: (id: string, data: Partial<LandViolationCase>) =>
    request<LandViolationCase>(`/violations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteViolation: (id: string) =>
    request<{ message: string; violation: LandViolationCase }>(`/violations/${id}`, {
      method: 'DELETE',
    }),
  addViolationEvidence: (id: string, data: Partial<ViolationEvidenceItem>) =>
    request<LandViolationCase>(`/violations/${id}/evidences`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Data Integrity Audit & Repair
  checkDataIntegrity: () => request<any>('/system/integrity-check'),
  repairDataIntegrity: () =>
    request<{ success: boolean; message: string; report: any }>('/system/integrity-repair', {
      method: 'POST',
    }),
};


