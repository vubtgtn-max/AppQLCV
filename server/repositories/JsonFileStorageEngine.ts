import { Database } from '../db';
import {
  CollectionName,
  IStorageEngine,
  ITransactionContext,
  IWriteBatch,
  IRepository,
  IDossierRepository,
  IUserRepository,
  ITaskRepository,
  INotificationRepository,
  IActivityLogRepository,
  ISettingsRepository,
  IdempotencyRecord,
  MutationContext,
  QueryFilter,
  QueryOptions,
} from './types';
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
  AlertMessageLog,
  LandProject,
} from '../../src/types';

function matchesFilters<T>(item: T, filters?: QueryFilter[]): boolean {
  if (!filters || filters.length === 0) return true;
  for (const f of filters) {
    const val = (item as any)[f.field];
    switch (f.op) {
      case '==':
        if (val !== f.value) return false;
        break;
      case '!=':
        if (val === f.value) return false;
        break;
      case '>':
        if (!(val > f.value)) return false;
        break;
      case '>=':
        if (!(val >= f.value)) return false;
        break;
      case '<':
        if (!(val < f.value)) return false;
        break;
      case '<=':
        if (!(val <= f.value)) return false;
        break;
      case 'in':
        if (!Array.isArray(f.value) || !f.value.includes(val)) return false;
        break;
      case 'array-contains':
        if (!Array.isArray(val) || !val.includes(f.value)) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

function applyOptions<T>(items: T[], options?: QueryOptions): T[] {
  let result = [...items];
  if (options?.filters && options.filters.length > 0) {
    result = result.filter((item) => matchesFilters(item, options.filters));
  }
  if (options?.orderBy) {
    const field = options.orderBy;
    const dir = options.orderDirection === 'desc' ? -1 : 1;
    result.sort((a: any, b: any) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      return aVal > bVal ? dir : -dir;
    });
  }
  if (typeof options?.offset === 'number' && options.offset > 0) {
    result = result.slice(options.offset);
  }
  if (typeof options?.limit === 'number' && options.limit > 0) {
    result = result.slice(0, options.limit);
  }
  return result;
}

class BaseJsonRepository<T extends { id: string }> implements IRepository<T> {
  constructor(
    protected readonly db: Database,
    protected readonly collectionKey: keyof ReturnType<Database['getData']>
  ) {}

  protected getList(): T[] {
    const data = this.db.getData();
    if (!data[this.collectionKey]) {
      (data as any)[this.collectionKey] = [];
    }
    return (data[this.collectionKey] as any) as T[];
  }

  async findById(id: string): Promise<T | null> {
    const list = this.getList();
    const found = list.find((item) => item.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findMany(options?: QueryOptions): Promise<T[]> {
    const list = this.getList();
    const filtered = applyOptions(list, options);
    return JSON.parse(JSON.stringify(filtered));
  }

  async create(item: T, _context?: MutationContext): Promise<T> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      const existing = list.find((x) => x.id === item.id);
      if (existing) {
        throw new Error(`Item with id '${item.id}' already exists in collection '${String(this.collectionKey)}'.`);
      }
      list.unshift(JSON.parse(JSON.stringify(item)));
      await this.db.save();
      return JSON.parse(JSON.stringify(item));
    });
  }

  async update(id: string, updates: Partial<T>, _context?: MutationContext): Promise<T> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) {
        throw new Error(`Item with id '${id}' not found in collection '${String(this.collectionKey)}'.`);
      }
      const updated = {
        ...list[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      list[idx] = updated;
      await this.db.save();
      return JSON.parse(JSON.stringify(updated));
    });
  }

  async delete(id: string, _context?: MutationContext): Promise<boolean> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      const idx = list.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      list.splice(idx, 1);
      await this.db.save();
      return true;
    });
  }

  async count(filters?: QueryFilter[]): Promise<number> {
    const list = this.getList();
    if (!filters || filters.length === 0) return list.length;
    return list.filter((x) => matchesFilters(x, filters)).length;
  }
}

class JsonDossierRepository extends BaseJsonRepository<Dossier> implements IDossierRepository {
  constructor(db: Database) {
    super(db, 'dossiers');
  }

  async findByCode(code: string): Promise<Dossier | null> {
    const list = this.getList();
    const clean = (code || '').trim().toLowerCase();
    const found = list.find((d) => (d.code || '').trim().toLowerCase() === clean);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async softDelete(id: string, deletedBy: string, context?: MutationContext): Promise<Dossier> {
    return this.db.runInMutationLock(async () => {
      const dossiers = this.getList();
      const idx = dossiers.findIndex((d) => d.id === id);
      if (idx === -1) {
        throw new Error(`Hồ sơ với ID '${id}' không tồn tại.`);
      }
      const item = dossiers[idx];
      dossiers.splice(idx, 1);

      const data = this.db.getData();
      if (!data.deletedDossiers) data.deletedDossiers = [];

      const deletedItem: Dossier = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
      data.deletedDossiers.unshift(deletedItem);

      this.db.addActivityLog(
        {
          userId: context?.userId || deletedBy || 'system',
          userName: context?.userName || 'Cán bộ',
          action: 'DELETE',
          module: 'dossiers',
          recordId: item.id,
          recordCode: item.code,
          description: `Đã xóa hồ sơ số ${item.code} (${item.owner}) và chuyển vào Thùng rác.`,
        },
        false
      );

      await this.db.save();
      return JSON.parse(JSON.stringify(deletedItem));
    });
  }

  async restore(id: string, context?: MutationContext): Promise<Dossier> {
    return this.db.runInMutationLock(async () => {
      const data = this.db.getData();
      if (!data.deletedDossiers) data.deletedDossiers = [];
      const idx = data.deletedDossiers.findIndex((d) => d.id === id);
      if (idx === -1) {
        throw new Error(`Không tìm thấy hồ sơ ID '${id}' trong kho đã xóa.`);
      }
      const item = data.deletedDossiers[idx];
      data.deletedDossiers.splice(idx, 1);

      const restoredItem: Dossier = {
        ...item,
        status: 'in_progress',
        updatedAt: new Date().toISOString(),
      };
      data.dossiers.unshift(restoredItem);

      this.db.addActivityLog(
        {
          userId: context?.userId || 'system',
          userName: context?.userName || 'Cán bộ',
          action: 'RESTORE',
          module: 'dossiers',
          description: `Đã khôi phục hồ sơ ${item.code} (${item.owner}) từ Thùng rác.`,
        },
        false
      );

      await this.db.save();
      return JSON.parse(JSON.stringify(restoredItem));
    });
  }

  async restoreAll(context?: MutationContext): Promise<number> {
    return this.db.runInMutationLock(async () => {
      const data = this.db.getData();
      if (!data.deletedDossiers || data.deletedDossiers.length === 0) {
        return 0;
      }
      const count = data.deletedDossiers.length;
      const restored = data.deletedDossiers.map((d) => ({
        ...d,
        status: 'in_progress' as const,
        updatedAt: new Date().toISOString(),
      }));
      data.dossiers.unshift(...restored);
      data.deletedDossiers = [];

      this.db.addActivityLog(
        {
          userId: context?.userId || 'system',
          userName: context?.userName || 'Cán bộ',
          action: 'RESTORE',
          module: 'dossiers',
          description: `Đã khôi phục toàn bộ ${count} hồ sơ từ Thùng rác.`,
        },
        false
      );

      await this.db.save();
      return count;
    });
  }

  async createBatch(
    dossiers: Dossier[],
    context?: MutationContext
  ): Promise<{ count: number; dossiers: Dossier[] }> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      const existingCodes = new Set(list.map((d) => (d.code || '').trim()));
      const createdList: Dossier[] = [];

      for (const item of dossiers) {
        let code = item.code ? String(item.code).trim() : '';
        if (!code || existingCodes.has(code)) {
          let counter = 1;
          const base = code || 'HS';
          while (existingCodes.has(`${base}_${counter}`)) {
            counter++;
          }
          code = `${base}_${counter}`;
        }
        existingCodes.add(code);

        const newDossier: Dossier = {
          ...item,
          id: item.id || this.db.generateUniqueId('dos'),
          code,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.unshift(newDossier);
        createdList.push(newDossier);
      }

      this.db.addActivityLog(
        {
          userId: context?.userId || 'system',
          userName: context?.userName || 'Hệ thống',
          action: 'CREATE',
          module: 'dossiers',
          description: `Đã nhập và lưu thành công ${createdList.length} hồ sơ đất đai vào hệ thống.`,
        },
        false
      );

      await this.db.save();
      return {
        count: createdList.length,
        dossiers: JSON.parse(JSON.stringify(createdList)),
      };
    });
  }
}

class JsonUserRepository extends BaseJsonRepository<User> implements IUserRepository {
  constructor(db: Database) {
    super(db, 'users');
  }

  async findByUsername(username: string): Promise<User | null> {
    const list = this.getList();
    const clean = (username || '').trim().toLowerCase();
    const found = list.find((u) => (u.username || '').trim().toLowerCase() === clean);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async findByPhoneOrEmail(query: string): Promise<User | null> {
    const list = this.getList();
    const clean = (query || '').trim().toLowerCase();
    const cleanPhone = clean.replace(/\D/g, '');
    const found = list.find((u) => {
      const uUser = (u.username || '').toLowerCase().trim();
      const uEmail = (u.email || '').toLowerCase().trim();
      const uName = (u.name || '').toLowerCase().trim();
      const uPhone = (u.phone || '').replace(/\D/g, '');
      return (
        uUser === clean ||
        uEmail === clean ||
        uName === clean ||
        (cleanPhone.length >= 7 && uPhone === cleanPhone)
      );
    });
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async toggleLock(id: string, _lockedBy: string, context?: MutationContext): Promise<User> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      const user = list.find((u) => u.id === id);
      if (!user) throw new Error(`Không tìm thấy cán bộ với ID '${id}'.`);
      const newStatus = user.status === 'locked' ? 'active' : 'locked';
      user.status = newStatus;
      user.updatedAt = new Date().toISOString();

      this.db.addActivityLog(
        {
          userId: context?.userId || 'system',
          userName: context?.userName || 'Quản trị viên',
          action: 'UPDATE',
          module: 'users',
          description: `Đã ${newStatus === 'locked' ? 'khóa' : 'mở khóa'} tài khoản cán bộ ${user.name} (${user.username}).`,
        },
        false
      );

      await this.db.save();
      return JSON.parse(JSON.stringify(user));
    });
  }

  async approve(id: string, _approvedBy: string, context?: MutationContext): Promise<User> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      const user = list.find((u) => u.id === id);
      if (!user) throw new Error(`Không tìm thấy tài khoản với ID '${id}'.`);
      user.approved = true;
      user.status = 'active';
      user.updatedAt = new Date().toISOString();

      this.db.addActivityLog(
        {
          userId: context?.userId || 'system',
          userName: context?.userName || 'Quản trị viên',
          action: 'UPDATE',
          module: 'users',
          description: `Đã phê duyệt tài khoản cán bộ ${user.name} (${user.username}).`,
        },
        false
      );

      await this.db.save();
      return JSON.parse(JSON.stringify(user));
    });
  }
}

class JsonTaskRepository extends BaseJsonRepository<Task> implements ITaskRepository {
  constructor(db: Database) {
    super(db, 'tasks');
  }

  async findByCode(code: string): Promise<Task | null> {
    const list = this.getList();
    const clean = (code || '').trim().toLowerCase();
    const found = list.find((t) => (t.code || '').trim().toLowerCase() === clean);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async createBatch(tasks: Task[], context?: MutationContext): Promise<{ count: number; tasks: Task[] }> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      const created: Task[] = [];
      for (const t of tasks) {
        const item: Task = {
          ...t,
          id: t.id || this.db.generateUniqueId('task'),
          createdAt: t.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.unshift(item);
        created.push(item);
      }

      this.db.addActivityLog(
        {
          userId: context?.userId || 'system',
          userName: context?.userName || 'Hệ thống',
          action: 'CREATE',
          module: 'tasks',
          description: `Đã nhập và lưu thành công ${created.length} nhiệm vụ vào hệ thống.`,
        },
        false
      );

      await this.db.save();
      return {
        count: created.length,
        tasks: JSON.parse(JSON.stringify(created)),
      };
    });
  }
}

class JsonNotificationRepository extends BaseJsonRepository<NotificationItem> implements INotificationRepository {
  constructor(db: Database) {
    super(db, 'notifications');
  }

  async markRead(id: string, _context?: MutationContext): Promise<boolean> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      const notif = list.find((n) => n.id === id);
      if (!notif) return false;
      notif.isRead = true;
      await this.db.save();
      return true;
    });
  }

  async markAllRead(userId?: string, _context?: MutationContext): Promise<number> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      let count = 0;
      list.forEach((n) => {
        if (!userId || n.userId === userId) {
          if (!n.isRead) {
            n.isRead = true;
            count++;
          }
        }
      });
      if (count > 0) {
        await this.db.save();
      }
      return count;
    });
  }

  async clearAll(userId?: string, _context?: MutationContext): Promise<number> {
    return this.db.runInMutationLock(async () => {
      const data = this.db.getData();
      const initialLen = data.notifications.length;
      if (userId) {
        data.notifications = data.notifications.filter((n) => n.userId !== userId);
      } else {
        data.notifications = [];
      }
      const count = initialLen - data.notifications.length;
      if (count > 0) {
        await this.db.save();
      }
      return count;
    });
  }

  async createBatch(notifications: NotificationItem[], _context?: MutationContext): Promise<number> {
    return this.db.runInMutationLock(async () => {
      const list = this.getList();
      for (const n of notifications) {
        list.unshift({
          ...n,
          id: n.id || this.db.generateUniqueId('notif'),
          createdAt: n.createdAt || new Date().toISOString(),
        });
      }
      await this.db.save();
      return notifications.length;
    });
  }
}

class JsonActivityLogRepository extends BaseJsonRepository<ActivityLog> implements IActivityLogRepository {
  constructor(db: Database) {
    super(db, 'activityLogs');
  }

  async addLog(log: Omit<ActivityLog, 'id' | 'createdAt'>, _context?: MutationContext): Promise<ActivityLog> {
    return this.db.runInMutationLock(async () => {
      const created = this.db.addActivityLog(log, false);
      await this.db.save();
      return JSON.parse(JSON.stringify(created));
    });
  }

  async clearLogs(_context?: MutationContext): Promise<number> {
    return this.db.runInMutationLock(async () => {
      const data = this.db.getData();
      const count = data.activityLogs.length;
      data.activityLogs = [];
      await this.db.save();
      return count;
    });
  }
}

class JsonSettingsRepository implements ISettingsRepository {
  constructor(private readonly db: Database) {}

  async getSettings(): Promise<AppSettings> {
    const data = this.db.getData();
    return JSON.parse(JSON.stringify(data.settings));
  }

  async updateSettings(updates: Partial<AppSettings>, context?: MutationContext): Promise<AppSettings> {
    return this.db.runInMutationLock(async () => {
      const data = this.db.getData();
      data.settings = {
        ...data.settings,
        ...updates,
      };

      this.db.addActivityLog(
        {
          userId: context?.userId || 'system',
          userName: context?.userName || 'Quản trị viên',
          action: 'UPDATE',
          module: 'settings',
          description: 'Đã cập nhật cấu hình hệ thống.',
        },
        false
      );

      await this.db.save();
      return JSON.parse(JSON.stringify(data.settings));
    });
  }
}

class JsonWriteBatch implements IWriteBatch {
  private ops: Array<() => void> = [];

  constructor(private readonly db: Database) {}

  set<T>(collection: CollectionName, id: string, data: T): this {
    this.ops.push(() => {
      const coll = (this.db.getData() as any)[collection] as any[];
      if (Array.isArray(coll)) {
        const idx = coll.findIndex((item) => item.id === id);
        if (idx !== -1) {
          coll[idx] = JSON.parse(JSON.stringify(data));
        } else {
          coll.unshift(JSON.parse(JSON.stringify(data)));
        }
      } else if (collection === 'settings') {
        (this.db.getData() as any).settings = JSON.parse(JSON.stringify(data));
      }
    });
    return this;
  }

  update<T>(collection: CollectionName, id: string, updates: Partial<T>): this {
    this.ops.push(() => {
      const coll = (this.db.getData() as any)[collection] as any[];
      if (Array.isArray(coll)) {
        const idx = coll.findIndex((item) => item.id === id);
        if (idx !== -1) {
          coll[idx] = {
            ...coll[idx],
            ...JSON.parse(JSON.stringify(updates)),
            updatedAt: new Date().toISOString(),
          };
        }
      } else if (collection === 'settings') {
        const current = (this.db.getData() as any).settings;
        (this.db.getData() as any).settings = {
          ...current,
          ...JSON.parse(JSON.stringify(updates)),
        };
      }
    });
    return this;
  }

  delete(collection: CollectionName, id: string): this {
    this.ops.push(() => {
      const coll = (this.db.getData() as any)[collection] as any[];
      if (Array.isArray(coll)) {
        const idx = coll.findIndex((item) => item.id === id);
        if (idx !== -1) {
          coll.splice(idx, 1);
        }
      }
    });
    return this;
  }

  async commit(): Promise<{ success: boolean; stateVersion: number; count: number }> {
    return this.db.runInMutationLock(async () => {
      for (const op of this.ops) {
        op();
      }
      await this.db.save();
      return {
        success: true,
        stateVersion: this.db.getStateVersion(),
        count: this.ops.length,
      };
    });
  }
}

export class JsonFileStorageEngine implements IStorageEngine {
  readonly name = 'JsonFileStorageEngine';
  readonly isCloudFirestore = false;

  private readonly db: Database;
  private readonly idempotencyStore: Map<string, IdempotencyRecord> = new Map();
  private readonly IDEMPOTENCY_PROCESSING_TIMEOUT_MS = 30000; // 30s crash-recovery threshold

  readonly dossiers: IDossierRepository;
  readonly deletedDossiers: IRepository<Dossier>;
  readonly users: IUserRepository;
  readonly tasks: ITaskRepository;
  readonly activityLogs: IActivityLogRepository;
  readonly notifications: INotificationRepository;
  readonly calendarEvents: IRepository<CalendarEvent>;
  readonly registerBooks: IRepository<RegisterBook>;
  readonly documents: IRepository<DocumentItem>;
  readonly projects: IRepository<LandProject>;
  readonly settings: ISettingsRepository;
  readonly alertLogs: IRepository<AlertMessageLog>;

  constructor() {
    this.db = Database.getInstance();
    this.dossiers = new JsonDossierRepository(this.db);
    this.deletedDossiers = new BaseJsonRepository<Dossier>(this.db, 'deletedDossiers' as any);
    this.users = new JsonUserRepository(this.db);
    this.tasks = new JsonTaskRepository(this.db);
    this.activityLogs = new JsonActivityLogRepository(this.db);
    this.notifications = new JsonNotificationRepository(this.db);
    this.calendarEvents = new BaseJsonRepository<CalendarEvent>(this.db, 'calendarEvents');
    this.registerBooks = new BaseJsonRepository<RegisterBook>(this.db, 'registerBooks');
    this.documents = new BaseJsonRepository<DocumentItem>(this.db, 'documents');
    this.projects = new BaseJsonRepository<LandProject>(this.db, 'projects');
    this.settings = new JsonSettingsRepository(this.db);
    this.alertLogs = new BaseJsonRepository<AlertMessageLog>(this.db, 'alertLogs');
  }

  async init(): Promise<void> {
    // Database singleton is already initialized in memory
  }

  async getStateVersion(): Promise<number> {
    return this.db.getStateVersion();
  }

  async runTransaction<R>(fn: (tx: ITransactionContext) => Promise<R>): Promise<R> {
    return this.db.runInMutationLock(async () => {
      const data = this.db.getData();
      const tx: ITransactionContext = {
        get: async <T>(collection: CollectionName, id: string): Promise<T | null> => {
          if (collection === 'settings') {
            return JSON.parse(JSON.stringify(data.settings)) as T;
          }
          const coll = (data as any)[collection] as any[];
          if (!Array.isArray(coll)) return null;
          const found = coll.find((item) => item.id === id);
          return found ? (JSON.parse(JSON.stringify(found)) as T) : null;
        },
        set: <T>(collection: CollectionName, id: string, itemData: T) => {
          if (collection === 'settings') {
            data.settings = JSON.parse(JSON.stringify(itemData));
            return;
          }
          let coll = (data as any)[collection] as any[];
          if (!Array.isArray(coll)) {
            coll = [];
            (data as any)[collection] = coll;
          }
          const idx = coll.findIndex((x) => x.id === id);
          if (idx !== -1) {
            coll[idx] = JSON.parse(JSON.stringify(itemData));
          } else {
            coll.unshift(JSON.parse(JSON.stringify(itemData)));
          }
        },
        update: <T>(collection: CollectionName, id: string, updates: Partial<T>) => {
          if (collection === 'settings') {
            data.settings = { ...data.settings, ...JSON.parse(JSON.stringify(updates)) };
            return;
          }
          const coll = (data as any)[collection] as any[];
          if (Array.isArray(coll)) {
            const idx = coll.findIndex((x) => x.id === id);
            if (idx !== -1) {
              coll[idx] = {
                ...coll[idx],
                ...JSON.parse(JSON.stringify(updates)),
                updatedAt: new Date().toISOString(),
              };
            }
          }
        },
        delete: (collection: CollectionName, id: string) => {
          const coll = (data as any)[collection] as any[];
          if (Array.isArray(coll)) {
            const idx = coll.findIndex((x) => x.id === id);
            if (idx !== -1) {
              coll.splice(idx, 1);
            }
          }
        },
      };

      const result = await fn(tx);
      await this.db.save();
      return result;
    });
  }

  createWriteBatch(): IWriteBatch {
    return new JsonWriteBatch(this.db);
  }

  async checkIdempotency(key: string): Promise<IdempotencyRecord | null> {
    const record = this.idempotencyStore.get(key);
    if (!record) return null;

    const now = Date.now();
    const expiresAt = new Date(record.expiresAt).getTime();
    if (now > expiresAt) {
      this.idempotencyStore.delete(key);
      return null;
    }

    // Crash recovery: If stuck in PROCESSING longer than threshold, treat as timed-out/failed
    if (record.status === 'PROCESSING') {
      const updatedAt = new Date(record.updatedAt).getTime();
      if (now - updatedAt > this.IDEMPOTENCY_PROCESSING_TIMEOUT_MS) {
        record.status = 'FAILED';
        record.error = 'Operation timed out during processing (potential instance crash). Recovered for retry.';
        record.updatedAt = new Date().toISOString();
      }
    }

    return JSON.parse(JSON.stringify(record));
  }

  async setIdempotencyProcessing(key: string, ttlSeconds: number = 86400): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    this.idempotencyStore.set(key, {
      key,
      status: 'PROCESSING',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      instanceId: String(process.pid),
    });
  }

  async setIdempotencySuccess(key: string, response: any, ttlSeconds: number = 86400): Promise<void> {
    const existing = this.idempotencyStore.get(key);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    this.idempotencyStore.set(key, {
      key,
      status: 'SUCCESS',
      response: JSON.parse(JSON.stringify(response)),
      createdAt: existing?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      instanceId: String(process.pid),
    });
  }

  async setIdempotencyFailed(key: string, error: string): Promise<void> {
    const existing = this.idempotencyStore.get(key);
    const now = new Date();
    this.idempotencyStore.set(key, {
      key,
      status: 'FAILED',
      error,
      createdAt: existing?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: existing?.expiresAt || new Date(now.getTime() + 3600000).toISOString(),
      instanceId: String(process.pid),
    });
  }
}
