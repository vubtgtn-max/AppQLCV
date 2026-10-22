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

export type CollectionName =
  | 'dossiers'
  | 'deletedDossiers'
  | 'users'
  | 'tasks'
  | 'activityLogs'
  | 'notifications'
  | 'calendarEvents'
  | 'registerBooks'
  | 'documents'
  | 'projects'
  | 'settings'
  | 'alertLogs'
  | 'idempotency_keys';

export type WhereFilterOp = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'array-contains';

export interface QueryFilter {
  field: string;
  op: WhereFilterOp;
  value: any;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MutationContext {
  userId?: string;
  userName?: string;
  idempotencyKey?: string;
  timestamp?: string;
  reason?: string;
  skipStateVersionIncrement?: boolean;
}

export interface IdempotencyRecord {
  key: string;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
  response?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  instanceId?: string;
}

export interface ITransactionContext {
  get<T>(collection: CollectionName, id: string): Promise<T | null>;
  set<T>(collection: CollectionName, id: string, data: T): void;
  update<T>(collection: CollectionName, id: string, updates: Partial<T>): void;
  delete(collection: CollectionName, id: string): void;
}

export interface IWriteBatch {
  set<T>(collection: CollectionName, id: string, data: T): this;
  update<T>(collection: CollectionName, id: string, updates: Partial<T>): this;
  delete(collection: CollectionName, id: string): this;
  commit(): Promise<{ success: boolean; stateVersion: number; count: number }>;
}

export interface IRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findMany(options?: QueryOptions): Promise<T[]>;
  create(item: T, context?: MutationContext): Promise<T>;
  update(id: ID, updates: Partial<T>, context?: MutationContext): Promise<T>;
  delete(id: ID, context?: MutationContext): Promise<boolean>;
  count(filters?: QueryFilter[]): Promise<number>;
}

export interface IDossierRepository extends IRepository<Dossier> {
  findByCode(code: string): Promise<Dossier | null>;
  softDelete(id: string, deletedBy: string, context?: MutationContext): Promise<Dossier>;
  restore(id: string, context?: MutationContext): Promise<Dossier>;
  restoreAll(context?: MutationContext): Promise<number>;
  createBatch(dossiers: Dossier[], context?: MutationContext): Promise<{ count: number; dossiers: Dossier[] }>;
}

export interface IUserRepository extends IRepository<User> {
  findByUsername(username: string): Promise<User | null>;
  findByPhoneOrEmail(query: string): Promise<User | null>;
  toggleLock(id: string, lockedBy: string, context?: MutationContext): Promise<User>;
  approve(id: string, approvedBy: string, context?: MutationContext): Promise<User>;
}

export interface ITaskRepository extends IRepository<Task> {
  findByCode(code: string): Promise<Task | null>;
  createBatch(tasks: Task[], context?: MutationContext): Promise<{ count: number; tasks: Task[] }>;
}

export interface INotificationRepository extends IRepository<NotificationItem> {
  markRead(id: string, context?: MutationContext): Promise<boolean>;
  markAllRead(userId?: string, context?: MutationContext): Promise<number>;
  clearAll(userId?: string, context?: MutationContext): Promise<number>;
  createBatch(notifications: NotificationItem[], context?: MutationContext): Promise<number>;
}

export interface IActivityLogRepository extends IRepository<ActivityLog> {
  addLog(log: Omit<ActivityLog, 'id' | 'createdAt'>, context?: MutationContext): Promise<ActivityLog>;
  clearLogs(context?: MutationContext): Promise<number>;
}

export interface ISettingsRepository {
  getSettings(): Promise<AppSettings>;
  updateSettings(updates: Partial<AppSettings>, context?: MutationContext): Promise<AppSettings>;
}

export interface IStorageEngine {
  readonly name: string;
  readonly isCloudFirestore: boolean;
  init(): Promise<void>;
  getStateVersion(): Promise<number>;

  runTransaction<R>(fn: (tx: ITransactionContext) => Promise<R>): Promise<R>;
  createWriteBatch(): IWriteBatch;

  // Idempotency
  checkIdempotency(key: string): Promise<IdempotencyRecord | null>;
  setIdempotencyProcessing(key: string, ttlSeconds?: number): Promise<void>;
  setIdempotencySuccess(key: string, response: any, ttlSeconds?: number): Promise<void>;
  setIdempotencyFailed(key: string, error: string): Promise<void>;

  // Repositories
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
}
