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

/**
 * FirestoreStorageEngine is a strict design skeleton for Google Cloud Firestore integration.
 * In Phase 3B-1.5, it is NOT wired to production and does NOT connect to Google Cloud,
 * ensuring zero premature infrastructure mutations while maintaining complete compile-time type safety.
 */
class FirestoreBaseRepository<T extends { id: string }> implements IRepository<T> {
  constructor(protected readonly collectionName: CollectionName) {}

  async findById(_id: string): Promise<T | null> {
    throw new Error(`[FirestoreEngine:BLOCKED] Cannot query '${this.collectionName}': Firestore is not yet connected.`);
  }

  async findMany(_options?: QueryOptions): Promise<T[]> {
    throw new Error(`[FirestoreEngine:BLOCKED] Cannot query '${this.collectionName}': Firestore is not yet connected.`);
  }

  async create(_item: T, _context?: MutationContext): Promise<T> {
    throw new Error(`[FirestoreEngine:BLOCKED] Cannot create in '${this.collectionName}': Firestore is not yet connected.`);
  }

  async update(_id: string, _updates: Partial<T>, _context?: MutationContext): Promise<T> {
    throw new Error(`[FirestoreEngine:BLOCKED] Cannot update in '${this.collectionName}': Firestore is not yet connected.`);
  }

  async delete(_id: string, _context?: MutationContext): Promise<boolean> {
    throw new Error(`[FirestoreEngine:BLOCKED] Cannot delete in '${this.collectionName}': Firestore is not yet connected.`);
  }

  async count(_filters?: QueryFilter[]): Promise<number> {
    throw new Error(`[FirestoreEngine:BLOCKED] Cannot count in '${this.collectionName}': Firestore is not yet connected.`);
  }
}

class FirestoreDossierRepository extends FirestoreBaseRepository<Dossier> implements IDossierRepository {
  constructor() {
    super('dossiers');
  }

  async findByCode(_code: string): Promise<Dossier | null> {
    throw new Error('[FirestoreEngine:BLOCKED] findByCode not available in offline review phase.');
  }

  async softDelete(_id: string, _deletedBy: string, _context?: MutationContext): Promise<Dossier> {
    throw new Error('[FirestoreEngine:BLOCKED] softDelete not available in offline review phase.');
  }

  async restore(_id: string, _context?: MutationContext): Promise<Dossier> {
    throw new Error('[FirestoreEngine:BLOCKED] restore not available in offline review phase.');
  }

  async restoreAll(_context?: MutationContext): Promise<number> {
    throw new Error('[FirestoreEngine:BLOCKED] restoreAll not available in offline review phase.');
  }

  async createBatch(
    _dossiers: Dossier[],
    _context?: MutationContext
  ): Promise<{ count: number; dossiers: Dossier[] }> {
    throw new Error('[FirestoreEngine:BLOCKED] createBatch not available in offline review phase.');
  }
}

class FirestoreUserRepository extends FirestoreBaseRepository<User> implements IUserRepository {
  constructor() {
    super('users');
  }

  async findByUsername(_username: string): Promise<User | null> {
    throw new Error('[FirestoreEngine:BLOCKED] findByUsername not available in offline review phase.');
  }

  async findByPhoneOrEmail(_query: string): Promise<User | null> {
    throw new Error('[FirestoreEngine:BLOCKED] findByPhoneOrEmail not available in offline review phase.');
  }

  async toggleLock(_id: string, _lockedBy: string, _context?: MutationContext): Promise<User> {
    throw new Error('[FirestoreEngine:BLOCKED] toggleLock not available in offline review phase.');
  }

  async approve(_id: string, _approvedBy: string, _context?: MutationContext): Promise<User> {
    throw new Error('[FirestoreEngine:BLOCKED] approve not available in offline review phase.');
  }
}

class FirestoreTaskRepository extends FirestoreBaseRepository<Task> implements ITaskRepository {
  constructor() {
    super('tasks');
  }

  async findByCode(_code: string): Promise<Task | null> {
    throw new Error('[FirestoreEngine:BLOCKED] findByCode not available in offline review phase.');
  }

  async createBatch(_tasks: Task[], _context?: MutationContext): Promise<{ count: number; tasks: Task[] }> {
    throw new Error('[FirestoreEngine:BLOCKED] createBatch not available in offline review phase.');
  }
}

class FirestoreNotificationRepository extends FirestoreBaseRepository<NotificationItem> implements INotificationRepository {
  constructor() {
    super('notifications');
  }

  async markRead(_id: string, _context?: MutationContext): Promise<boolean> {
    throw new Error('[FirestoreEngine:BLOCKED] markRead not available in offline review phase.');
  }

  async markAllRead(_userId?: string, _context?: MutationContext): Promise<number> {
    throw new Error('[FirestoreEngine:BLOCKED] markAllRead not available in offline review phase.');
  }

  async clearAll(_userId?: string, _context?: MutationContext): Promise<number> {
    throw new Error('[FirestoreEngine:BLOCKED] clearAll not available in offline review phase.');
  }

  async createBatch(_notifications: NotificationItem[], _context?: MutationContext): Promise<number> {
    throw new Error('[FirestoreEngine:BLOCKED] createBatch not available in offline review phase.');
  }
}

class FirestoreActivityLogRepository extends FirestoreBaseRepository<ActivityLog> implements IActivityLogRepository {
  constructor() {
    super('activityLogs');
  }

  async addLog(_log: Omit<ActivityLog, 'id' | 'createdAt'>, _context?: MutationContext): Promise<ActivityLog> {
    throw new Error('[FirestoreEngine:BLOCKED] addLog not available in offline review phase.');
  }

  async clearLogs(_context?: MutationContext): Promise<number> {
    throw new Error('[FirestoreEngine:BLOCKED] clearLogs not available in offline review phase.');
  }
}

class FirestoreSettingsRepository implements ISettingsRepository {
  async getSettings(): Promise<AppSettings> {
    throw new Error('[FirestoreEngine:BLOCKED] getSettings not available in offline review phase.');
  }

  async updateSettings(_updates: Partial<AppSettings>, _context?: MutationContext): Promise<AppSettings> {
    throw new Error('[FirestoreEngine:BLOCKED] updateSettings not available in offline review phase.');
  }
}

export class FirestoreStorageEngine implements IStorageEngine {
  readonly name = 'FirestoreStorageEngine';
  readonly isCloudFirestore = true;

  readonly dossiers: IDossierRepository = new FirestoreDossierRepository();
  readonly deletedDossiers: IRepository<Dossier> = new FirestoreBaseRepository<Dossier>('deletedDossiers');
  readonly users: IUserRepository = new FirestoreUserRepository();
  readonly tasks: ITaskRepository = new FirestoreTaskRepository();
  readonly activityLogs: IActivityLogRepository = new FirestoreActivityLogRepository();
  readonly notifications: INotificationRepository = new FirestoreNotificationRepository();
  readonly calendarEvents: IRepository<CalendarEvent> = new FirestoreBaseRepository<CalendarEvent>('calendarEvents');
  readonly registerBooks: IRepository<RegisterBook> = new FirestoreBaseRepository<RegisterBook>('registerBooks');
  readonly documents: IRepository<DocumentItem> = new FirestoreBaseRepository<DocumentItem>('documents');
  readonly projects: IRepository<LandProject> = new FirestoreBaseRepository<LandProject>('projects');
  readonly settings: ISettingsRepository = new FirestoreSettingsRepository();
  readonly alertLogs: IRepository<AlertMessageLog> = new FirestoreBaseRepository<AlertMessageLog>('alertLogs');

  async init(): Promise<void> {
    throw new Error('[FirestoreEngine:BLOCKED] Firestore credentials not provisioned on Google Cloud Project.');
  }

  async getStateVersion(): Promise<number> {
    throw new Error('[FirestoreEngine:BLOCKED] Firestore not connected.');
  }

  async runTransaction<R>(_fn: (tx: ITransactionContext) => Promise<R>): Promise<R> {
    throw new Error('[FirestoreEngine:BLOCKED] Transactions require active Firestore connection.');
  }

  createWriteBatch(): IWriteBatch {
    throw new Error('[FirestoreEngine:BLOCKED] WriteBatches require active Firestore connection.');
  }

  async checkIdempotency(_key: string): Promise<IdempotencyRecord | null> {
    return null;
  }

  async setIdempotencyProcessing(_key: string, _ttlSeconds?: number): Promise<void> {}
  async setIdempotencySuccess(_key: string, _response: any, _ttlSeconds?: number): Promise<void> {}
  async setIdempotencyFailed(_key: string, _error: string): Promise<void> {}
}
