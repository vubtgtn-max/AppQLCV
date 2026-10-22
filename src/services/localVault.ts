import { Dossier, Task, LandProject, PublicLandParcel, LandViolationCase, DisputeCase } from '../types';

const DB_NAME = 'DanangLandRecordsVault_v3';
const DB_VERSION = 3;
const DOSSIERS_STORE = 'dossiers';
const TASKS_STORE = 'tasks';
const PROJECTS_STORE = 'projects';
const PUBLIC_LANDS_STORE = 'publicLands';
const VIOLATIONS_STORE = 'violations';
const DISPUTES_STORE = 'disputes';
const META_STORE = 'meta';

const LOCAL_STORAGE_KEY = 'DANANG_LAND_VAULT_DOSSIERS_BACKUP';
const LOCAL_STORAGE_TIMESTAMP_KEY = 'DANANG_LAND_VAULT_LAST_SAVED';
const LOCAL_STORAGE_DELETED_KEY = 'DANANG_LAND_VAULT_DELETED_DOSSIERS';

const LOCAL_STORAGE_TASKS_KEY = 'DANANG_LAND_VAULT_TASKS_BACKUP';
const LOCAL_STORAGE_DELETED_TASKS_KEY = 'DANANG_LAND_VAULT_DELETED_TASKS';

const LOCAL_STORAGE_PROJECTS_KEY = 'DANANG_LAND_VAULT_PROJECTS_BACKUP';
const LOCAL_STORAGE_PUBLIC_LANDS_KEY = 'DANANG_LAND_VAULT_PUBLAND_BACKUP';
const LOCAL_STORAGE_VIOLATIONS_KEY = 'DANANG_LAND_VAULT_VIOL_BACKUP';
const LOCAL_STORAGE_DISPUTES_KEY = 'DANANG_LAND_VAULT_DISPUTES_BACKUP';
const LOCAL_STORAGE_REGISTER_BOOKS_KEY = 'DANANG_LAND_VAULT_BOOKS_BACKUP';

class LocalVaultService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private memoryCache: Dossier[] | null = null;
  private taskMemoryCache: Task[] | null = null;
  private projectMemoryCache: LandProject[] | null = null;
  private publicLandMemoryCache: PublicLandParcel[] | null = null;
  private violationMemoryCache: LandViolationCase[] | null = null;
  private disputeMemoryCache: DisputeCase[] | null = null;
  private isReconciling = false;
  private deletedTombstones: Set<string> = new Set();
  private deletedTaskTombstones: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
      this.loadDeletedTombstones();
      this.loadDeletedTaskTombstones();
      this.purgeMockTemplateData();
    }
  }

  public async purgeMockTemplateData(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((d: any) => d && !String(d.id || '').startsWith('dos_kep'));
            if (clean.length !== parsed.length) {
              window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clean));
              this.memoryCache = clean;
            }
          }
        }
      }
      const db = await this.initDB();
      if (db) {
        const tx = db.transaction(DOSSIERS_STORE, 'readwrite');
        const store = tx.objectStore(DOSSIERS_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
          const items = req.result || [];
          for (const item of items) {
            if (item && String(item.id || '').startsWith('dos_kep')) {
              store.delete(item.id);
            }
          }
        };
      }
    } catch (_) {}
  }

  private loadDeletedTombstones(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((k) => {
              if (k) this.deletedTombstones.add(String(k).trim());
            });
          }
        }
      }
    } catch (_) {}
  }

  private persistDeletedTombstones(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          LOCAL_STORAGE_DELETED_KEY,
          JSON.stringify(Array.from(this.deletedTombstones))
        );
      }
    } catch (_) {}
  }

  private loadDeletedTaskTombstones(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_DELETED_TASKS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((k) => {
              if (k) this.deletedTaskTombstones.add(String(k).trim());
            });
          }
        }
      }
    } catch (_) {}
  }

  private persistDeletedTaskTombstones(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          LOCAL_STORAGE_DELETED_TASKS_KEY,
          JSON.stringify(Array.from(this.deletedTaskTombstones))
        );
      }
    } catch (_) {}
  }

  public isDossierDeleted(id?: string, code?: string): boolean {
    if (id && (this.deletedTombstones.has(id) || id.startsWith('dos_kep'))) return true;
    if (code && this.deletedTombstones.has(code)) return true;
    return false;
  }

  public async markDossierDeleted(id: string, code?: string): Promise<void> {
    if (id) this.deletedTombstones.add(id);
    if (code) this.deletedTombstones.add(code);
    this.persistDeletedTombstones();
    await this.deleteLocalDossier(id, code);
  }

  public unmarkDossierDeleted(id: string, code?: string): void {
    if (id) this.deletedTombstones.delete(id);
    if (code) this.deletedTombstones.delete(code);
    this.persistDeletedTombstones();
  }

  public clearDeletedDossierTombstones(): void {
    this.deletedTombstones.clear();
    this.persistDeletedTombstones();
  }

  public isTaskDeleted(id?: string, code?: string): boolean {
    if (id && this.deletedTaskTombstones.has(id)) return true;
    if (code && this.deletedTaskTombstones.has(code)) return true;
    return false;
  }

  public async markTaskDeleted(id: string, code?: string): Promise<void> {
    if (id) this.deletedTaskTombstones.add(id);
    if (code) this.deletedTaskTombstones.add(code);
    this.persistDeletedTaskTombstones();
    await this.deleteLocalTask(id, code);
  }

  public unmarkTaskDeleted(id: string, code?: string): void {
    if (id) this.deletedTaskTombstones.delete(id);
    if (code) this.deletedTaskTombstones.delete(code);
    this.persistDeletedTaskTombstones();
  }

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;
    if (typeof window === 'undefined' || !window.indexedDB) {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db: IDBDatabase = e.target.result;
          if (!db.objectStoreNames.contains(DOSSIERS_STORE)) {
            const store = db.createObjectStore(DOSSIERS_STORE, { keyPath: 'id' });
            store.createIndex('code', 'code', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(TASKS_STORE)) {
            const tStore = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
            tStore.createIndex('code', 'code', { unique: false });
            tStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
            const pStore = db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
            pStore.createIndex('code', 'code', { unique: false });
            pStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(PUBLIC_LANDS_STORE)) {
            const pubStore = db.createObjectStore(PUBLIC_LANDS_STORE, { keyPath: 'id' });
            pubStore.createIndex('code', 'code', { unique: false });
            pubStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(VIOLATIONS_STORE)) {
            const vStore = db.createObjectStore(VIOLATIONS_STORE, { keyPath: 'id' });
            vStore.createIndex('code', 'code', { unique: false });
            vStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(DISPUTES_STORE)) {
            const dStore = db.createObjectStore(DISPUTES_STORE, { keyPath: 'id' });
            dStore.createIndex('code', 'code', { unique: false });
            dStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE, { keyPath: 'key' });
          }
        };

        req.onsuccess = (e: any) => {
          resolve(e.target.result);
        };

        req.onerror = (e) => {
          console.warn('[LOCAL_VAULT] IndexedDB open error, falling back to localStorage:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('[LOCAL_VAULT] IndexedDB initialization failed:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Save all dossiers to both IndexedDB and LocalStorage fallback.
   */
  public async saveDossiersLocally(dossiers: Dossier[]): Promise<void> {
    if (!Array.isArray(dossiers)) return;
    this.memoryCache = dossiers;
    const nowIso = new Date().toISOString();

    // 1. Fallback to localStorage for instant synchronous durability
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dossiers));
        window.localStorage.setItem(LOCAL_STORAGE_TIMESTAMP_KEY, nowIso);
      }
    } catch (lsErr) {
      console.warn('[LOCAL_VAULT] LocalStorage write error (quota might be full):', lsErr);
    }

    // 2. Persist to IndexedDB
    try {
      const db = await this.initDB();
      if (!db) return;

      const tx = db.transaction([DOSSIERS_STORE, META_STORE], 'readwrite');
      const store = tx.objectStore(DOSSIERS_STORE);
      const metaStore = tx.objectStore(META_STORE);

      // Clear old records and rewrite current snapshot
      store.clear();
      for (const dos of dossiers) {
        store.put(dos);
      }
      metaStore.put({ key: 'last_saved_at', value: nowIso, count: dossiers.length });
    } catch (err) {
      console.warn('[LOCAL_VAULT] IndexedDB save error:', err);
    }
  }

  /**
   * Fast load of dossiers from local storage on startup (before or parallel to network).
   */
  public async loadDossiersLocally(): Promise<Dossier[]> {
    if (this.memoryCache && this.memoryCache.length > 0) {
      return this.memoryCache;
    }

    // 1. Try IndexedDB
    try {
      const db = await this.initDB();
      if (db) {
        const dossiers = await new Promise<Dossier[]>((resolve) => {
          try {
            const tx = db.transaction(DOSSIERS_STORE, 'readonly');
            const store = tx.objectStore(DOSSIERS_STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch (e) {
            resolve([]);
          }
        });

        if (dossiers && dossiers.length > 0) {
          const clean = dossiers.filter((d) => !this.isDossierDeleted(d.id, d.code));
          this.memoryCache = clean;
          return clean;
        }
      }
    } catch (idbErr) {
      console.warn('[LOCAL_VAULT] IndexedDB read error:', idbErr);
    }

    // 2. Fallback to localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter((d) => !this.isDossierDeleted(d.id, d.code));
            this.memoryCache = clean;
            return clean;
          }
        }
      }
    } catch (lsErr) {
      console.warn('[LOCAL_VAULT] LocalStorage read fallback error:', lsErr);
    }

    return [];
  }

  /**
   * Upsert a single dossier into local vault immediately
   */
  public async upsertLocalDossier(dossier: Dossier): Promise<void> {
    if (!dossier || !dossier.id) return;
    const current = await this.loadDossiersLocally();
    const idx = current.findIndex((d) => d.id === dossier.id || (dossier.code && d.code === dossier.code));
    let next: Dossier[];
    if (idx >= 0) {
      next = [...current];
      next[idx] = { ...next[idx], ...dossier };
    } else {
      next = [dossier, ...current];
    }
    await this.saveDossiersLocally(next);
  }

  /**
   * Upsert multiple dossiers into local vault
   */
  public async upsertLocalDossiersBatch(newDossiers: Dossier[]): Promise<void> {
    if (!Array.isArray(newDossiers) || newDossiers.length === 0) return;
    const current = await this.loadDossiersLocally();
    const map = new Map<string, Dossier>();
    for (const d of current) {
      map.set(d.id, d);
      if (d.code) map.set(d.code, d);
    }
    for (const d of newDossiers) {
      map.set(d.id, d);
      if (d.code) map.set(d.code, d);
    }
    const merged = Array.from(new Set(Array.from(map.values())));
    await this.saveDossiersLocally(merged);
  }

  /**
   * Remove a dossier locally by ID and optional code
   */
  public async deleteLocalDossier(id: string, code?: string): Promise<void> {
    const current = await this.loadDossiersLocally();
    const filtered = current.filter((d) => d.id !== id && (!code || d.code !== code));
    this.memoryCache = filtered;
    await this.saveDossiersLocally(filtered);
  }

  /**
   * Save all tasks to IndexedDB and LocalStorage fallback.
   */
  public async saveTasksLocally(tasks: Task[]): Promise<void> {
    if (!Array.isArray(tasks)) return;
    const clean = tasks.filter((t) => !this.isTaskDeleted(t.id, t.code));
    this.taskMemoryCache = clean;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(clean));
      }
    } catch (_) {}

    try {
      const db = await this.initDB();
      if (!db) return;
      const tx = db.transaction([TASKS_STORE], 'readwrite');
      const store = tx.objectStore(TASKS_STORE);
      store.clear();
      for (const t of clean) {
        store.put(t);
      }
    } catch (_) {}
  }

  /**
   * Fast load of tasks from local storage on startup.
   */
  public async loadTasksLocally(): Promise<Task[]> {
    if (this.taskMemoryCache && this.taskMemoryCache.length > 0) {
      return this.taskMemoryCache.filter((t) => !this.isTaskDeleted(t.id, t.code));
    }

    try {
      const db = await this.initDB();
      if (db) {
        const tasks = await new Promise<Task[]>((resolve) => {
          try {
            const tx = db.transaction(TASKS_STORE, 'readonly');
            const store = tx.objectStore(TASKS_STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch (_) {
            resolve([]);
          }
        });

        if (tasks && tasks.length > 0) {
          const clean = tasks.filter((t) => !this.isTaskDeleted(t.id, t.code));
          this.taskMemoryCache = clean;
          return clean;
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_TASKS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter((t) => !this.isTaskDeleted(t.id, t.code));
            this.taskMemoryCache = clean;
            return clean;
          }
        }
      }
    } catch (_) {}

    return [];
  }

  /**
   * Upsert a task into local vault
   */
  public async upsertLocalTask(task: Task): Promise<void> {
    if (!task || !task.id || this.isTaskDeleted(task.id, task.code)) return;
    const current = await this.loadTasksLocally();
    const idx = current.findIndex((t) => t.id === task.id || (task.code && t.code === task.code));
    let next: Task[];
    if (idx >= 0) {
      next = [...current];
      next[idx] = { ...next[idx], ...task };
    } else {
      next = [task, ...current];
    }
    await this.saveTasksLocally(next);
  }

  /**
   * Remove a task locally by ID and optional code
   */
  public async deleteLocalTask(id: string, code?: string): Promise<void> {
    const current = await this.loadTasksLocally();
    const filtered = current.filter((t) => t.id !== id && (!code || t.code !== code));
    this.taskMemoryCache = filtered;
    await this.saveTasksLocally(filtered);
  }

  /**
   * Intelligent 2-way Reconcile for Tasks with updatedAt comparison
   */
  public async reconcileTasksWithServer(
    serverTasks: Task[],
    pushMissingToServer?: (missing: Task[]) => Promise<void>,
    serverDeletedTasks?: Task[]
  ): Promise<Task[]> {
    if (Array.isArray(serverDeletedTasks) && serverDeletedTasks.length > 0) {
      for (const del of serverDeletedTasks) {
        if (del.id) this.deletedTaskTombstones.add(del.id);
        if (del.code) this.deletedTaskTombstones.add(del.code);
      }
      this.persistDeletedTaskTombstones();
    }

    const rawLocalTasks = await this.loadTasksLocally();
    const cleanLocal = rawLocalTasks.filter((t) => !this.isTaskDeleted(t.id, t.code));
    const cleanServer = (serverTasks || []).filter((t) => !this.isTaskDeleted(t.id, t.code));

    const serverIds = new Set(cleanServer.map((t) => t.id));
    const serverCodes = new Set(cleanServer.map((t) => t.code).filter(Boolean));

    const missingOnServer = cleanLocal.filter(
      (t) => !serverIds.has(t.id) && (!t.code || !serverCodes.has(t.code))
    );

    const toPushToServer: Task[] = [...missingOnServer];
    const mergedMap = new Map<string, Task>();

    for (const st of cleanServer) {
      const key = st.id || st.code;
      if (key) mergedMap.set(key, st);
    }

    for (const lt of cleanLocal) {
      const key = lt.id || lt.code;
      if (!key) continue;
      const st = mergedMap.get(key) || (lt.code ? mergedMap.get(lt.code) : undefined);
      if (st) {
        const localTime = lt.updatedAt ? new Date(lt.updatedAt).getTime() : 0;
        const serverTime = st.updatedAt ? new Date(st.updatedAt).getTime() : 0;
        if (localTime > serverTime) {
          mergedMap.set(key, lt);
          toPushToServer.push(lt);
        }
      }
    }

    if (toPushToServer.length > 0 && pushMissingToServer) {
      try {
        await pushMissingToServer(toPushToServer);
      } catch (e) {
        console.error('[LOCAL_VAULT] Error syncing tasks to server:', e);
      }
    }

    const merged = Array.from(mergedMap.values());
    await this.saveTasksLocally(merged);
    return merged;
  }

  /**
   * Intelligent 2-way Reconcile between Local Vault and Server:
   * Prevents cold container reboot from wiping user entered dossiers,
   * while STRICTLY respecting user deletion and preventing deleted dossier resurrection!
   */
  public async reconcileWithServer(
    serverDossiers: Dossier[],
    pushMissingToServer?: (missing: Dossier[]) => Promise<void>,
    serverDeletedDossiers?: Dossier[]
  ): Promise<{ merged: Dossier[]; syncedCount: number }> {
    if (this.isReconciling) {
      const safe = (serverDossiers || []).filter((d) => !this.isDossierDeleted(d.id, d.code));
      return { merged: safe, syncedCount: 0 };
    }
    this.isReconciling = true;

    try {
      // 1. Ingest any server deleted records into local tombstones
      if (Array.isArray(serverDeletedDossiers) && serverDeletedDossiers.length > 0) {
        let changed = false;
        for (const del of serverDeletedDossiers) {
          if (del.id && !this.deletedTombstones.has(del.id)) {
            this.deletedTombstones.add(del.id);
            changed = true;
          }
          if (del.code && !this.deletedTombstones.has(del.code)) {
            this.deletedTombstones.add(del.code);
            changed = true;
          }
        }
        if (changed) {
          this.persistDeletedTombstones();
        }
      }

      // 2. Load and purge local vault from any deleted records
      const rawLocalDossiers = await this.loadDossiersLocally();
      const localDossiers = rawLocalDossiers.filter((d) => !this.isDossierDeleted(d.id, d.code));

      // 3. If server has dossiers, compare with local vault to find any valid non-deleted dossiers that server missed
      if (Array.isArray(serverDossiers) && serverDossiers.length > 0) {
        const cleanServerDossiers = serverDossiers.filter((d) => !this.isDossierDeleted(d.id, d.code));
        const serverIds = new Set(cleanServerDossiers.map((d) => d.id));
        const serverCodes = new Set(cleanServerDossiers.map((d) => d.code).filter(Boolean));

        const missingOnServer = localDossiers.filter(
          (d) => !serverIds.has(d.id) && (!d.code || !serverCodes.has(d.code))
        );

        const toPushToServer: Dossier[] = [...missingOnServer];
        const mergedMap = new Map<string, Dossier>();

        // Index clean server dossiers
        for (const s of cleanServerDossiers) {
          const key = s.id || s.code;
          if (key) mergedMap.set(key, s);
        }

        // Compare each local dossier with server dossier using updatedAt (Last-Write-Wins)
        for (const l of localDossiers) {
          const key = l.id || l.code;
          if (!key) continue;
          const s = mergedMap.get(key) || (l.code ? mergedMap.get(l.code) : undefined);
          if (s) {
            const localTime = l.updatedAt ? new Date(l.updatedAt).getTime() : 0;
            const serverTime = s.updatedAt ? new Date(s.updatedAt).getTime() : 0;
            if (localTime > serverTime) {
              // Local has newer edit! Keep local version and push to server
              mergedMap.set(key, l);
              toPushToServer.push(l);
            }
          }
        }

        if (toPushToServer.length > 0 && pushMissingToServer) {
          console.warn(`[LOCAL_VAULT_RECONCILE] Found ${toPushToServer.length} locally updated/missing dossiers. Auto-syncing to server...`);
          try {
            await pushMissingToServer(toPushToServer);
          } catch (e) {
            console.error('[LOCAL_VAULT_RECONCILE] Failed to push updated dossiers to server:', e);
          }
        }

        const merged = Array.from(mergedMap.values());
        await this.saveDossiersLocally(merged);
        return { merged, syncedCount: toPushToServer.length };
      }

      // 4. If server is completely empty (0 dossiers, e.g. fresh container startup),
      // auto-heal server from valid non-deleted local dossiers
      if ((!serverDossiers || serverDossiers.length === 0) && localDossiers.length > 0) {
        if (pushMissingToServer) {
          console.warn(`[LOCAL_VAULT_RECONCILE] Server has 0 dossiers! Auto-healing server with ${localDossiers.length} local dossiers...`);
          try {
            await pushMissingToServer(localDossiers);
          } catch (e) {
            console.error('[LOCAL_VAULT_RECONCILE] Failed to push local dossiers to empty server:', e);
          }
        }
        await this.saveDossiersLocally(localDossiers);
        return { merged: localDossiers, syncedCount: localDossiers.length };
      }

      return { merged: [], syncedCount: 0 };
    } finally {
      this.isReconciling = false;
    }
  }

  // ================= PROJECTS VAULT =================
  public async saveProjectsLocally(projects: LandProject[]): Promise<void> {
    if (!Array.isArray(projects)) return;
    this.projectMemoryCache = projects;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
      }
    } catch (_) {}

    try {
      const db = await this.initDB();
      if (!db) return;
      const tx = db.transaction([PROJECTS_STORE], 'readwrite');
      const store = tx.objectStore(PROJECTS_STORE);
      store.clear();
      for (const p of projects) {
        store.put(p);
      }
    } catch (_) {}
  }

  public async upsertLocalProject(project: LandProject): Promise<void> {
    if (!project || !project.id) return;
    const current = await this.loadProjectsLocally();
    const index = current.findIndex((p) => p.id === project.id || (project.code && p.code === project.code));
    if (index >= 0) {
      current[index] = { ...current[index], ...project };
    } else {
      current.unshift(project);
    }
    await this.saveProjectsLocally(current);
  }

  public async deleteLocalProject(id: string, code?: string): Promise<void> {
    const current = await this.loadProjectsLocally();
    const filtered = current.filter((p) => p.id !== id && (!code || p.code !== code));
    this.projectMemoryCache = filtered;
    await this.saveProjectsLocally(filtered);
  }

  public async loadProjectsLocally(): Promise<LandProject[]> {
    if (this.projectMemoryCache && this.projectMemoryCache.length > 0) {
      return this.projectMemoryCache;
    }
    try {
      const db = await this.initDB();
      if (db) {
        const list = await new Promise<LandProject[]>((resolve) => {
          try {
            const tx = db.transaction(PROJECTS_STORE, 'readonly');
            const store = tx.objectStore(PROJECTS_STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch (_) {
            resolve([]);
          }
        });
        if (list && list.length > 0) {
          this.projectMemoryCache = list;
          return list;
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.projectMemoryCache = parsed;
            return parsed;
          }
        }
      }
    } catch (_) {}
    return [];
  }

  public async reconcileProjectsWithServer(
    serverProjects: LandProject[],
    pushMissingToServer?: (missing: LandProject[]) => Promise<void>
  ): Promise<LandProject[]> {
    const local = await this.loadProjectsLocally();
    const serverSafe = Array.isArray(serverProjects) ? serverProjects : [];
    const serverIds = new Set(serverSafe.map((p) => p.id));
    const serverCodes = new Set(serverSafe.map((p) => p.code).filter(Boolean));

    const missingOnServer = local.filter(
      (p) => !serverIds.has(p.id) && (!p.code || !serverCodes.has(p.code))
    );

    const toPushToServer: LandProject[] = [...missingOnServer];
    const mergedMap = new Map<string, LandProject>();

    for (const sp of serverSafe) {
      const key = sp.id || sp.code;
      if (key) mergedMap.set(key, sp);
    }

    for (const lp of local) {
      const key = lp.id || lp.code;
      if (!key) continue;
      const sp = mergedMap.get(key) || (lp.code ? mergedMap.get(lp.code) : undefined);
      if (sp) {
        const localTime = lp.updatedAt ? new Date(lp.updatedAt).getTime() : 0;
        const serverTime = sp.updatedAt ? new Date(sp.updatedAt).getTime() : 0;
        if (localTime > serverTime) {
          mergedMap.set(key, lp);
          toPushToServer.push(lp);
        }
      }
    }

    if (toPushToServer.length > 0 && pushMissingToServer) {
      console.warn(`[LOCAL_VAULT] Reconciling ${toPushToServer.length} locally updated/missing projects back to server...`);
      try {
        await pushMissingToServer(toPushToServer);
      } catch (e) {
        console.error('[LOCAL_VAULT] Error syncing projects to server:', e);
      }
    }

    const merged = Array.from(mergedMap.values());
    await this.saveProjectsLocally(merged);
    return merged;
  }

  // ================= PUBLIC LAND (5%) VAULT =================
  public async savePublicLandsLocally(items: PublicLandParcel[]): Promise<void> {
    if (!Array.isArray(items)) return;
    this.publicLandMemoryCache = items;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_PUBLIC_LANDS_KEY, JSON.stringify(items));
      }
    } catch (_) {}

    try {
      const db = await this.initDB();
      if (!db) return;
      const tx = db.transaction([PUBLIC_LANDS_STORE], 'readwrite');
      const store = tx.objectStore(PUBLIC_LANDS_STORE);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    } catch (_) {}
  }

  public async upsertLocalPublicLand(parcel: PublicLandParcel): Promise<void> {
    if (!parcel || !parcel.id) return;
    const current = await this.loadPublicLandsLocally();
    const index = current.findIndex((p) => p.id === parcel.id || (parcel.code && p.code === parcel.code));
    if (index >= 0) {
      current[index] = { ...current[index], ...parcel };
    } else {
      current.unshift(parcel);
    }
    await this.savePublicLandsLocally(current);
  }

  public async deleteLocalPublicLand(id: string, code?: string): Promise<void> {
    const current = await this.loadPublicLandsLocally();
    const filtered = current.filter((p) => p.id !== id && (!code || p.code !== code));
    this.publicLandMemoryCache = filtered;
    await this.savePublicLandsLocally(filtered);
  }

  public async loadPublicLandsLocally(): Promise<PublicLandParcel[]> {
    if (this.publicLandMemoryCache && this.publicLandMemoryCache.length > 0) {
      return this.publicLandMemoryCache;
    }
    try {
      const db = await this.initDB();
      if (db) {
        const list = await new Promise<PublicLandParcel[]>((resolve) => {
          try {
            const tx = db.transaction(PUBLIC_LANDS_STORE, 'readonly');
            const store = tx.objectStore(PUBLIC_LANDS_STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch (_) {
            resolve([]);
          }
        });
        if (list && list.length > 0) {
          this.publicLandMemoryCache = list;
          return list;
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_PUBLIC_LANDS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.publicLandMemoryCache = parsed;
            return parsed;
          }
        }
      }
    } catch (_) {}
    return [];
  }

  public async reconcilePublicLandsWithServer(
    serverItems: PublicLandParcel[],
    pushMissingToServer?: (missing: PublicLandParcel[]) => Promise<void>,
    serverDeleted?: PublicLandParcel[]
  ): Promise<PublicLandParcel[]> {
    const local = await this.loadPublicLandsLocally();
    const serverSafe = Array.isArray(serverItems) ? serverItems : [];
    const serverSafeIds = new Set(serverSafe.map((item) => item.id));
    const serverSafeCodes = new Set(serverSafe.map((item) => item.code).filter(Boolean));

    // Only consider deleted if not present in active serverSafe
    const deletedIds = new Set(
      (serverDeleted || []).map((d) => d.id).filter((id) => !serverSafeIds.has(id))
    );
    const deletedCodes = new Set(
      (serverDeleted || []).map((d) => d.code).filter((c) => Boolean(c) && !serverSafeCodes.has(c))
    );

    const cleanLocal = local.filter((item) => !deletedIds.has(item.id) && (!item.code || !deletedCodes.has(item.code)));
    const serverIds = serverSafeIds;
    const serverCodes = serverSafeCodes;

    const missingOnServer = cleanLocal.filter(
      (item) => !serverIds.has(item.id) && (!item.code || !serverCodes.has(item.code))
    );

    const toPushToServer: PublicLandParcel[] = [...missingOnServer];
    const mergedMap = new Map<string, PublicLandParcel>();

    for (const sp of serverSafe) {
      const key = sp.id || sp.code;
      if (key) mergedMap.set(key, sp);
    }

    for (const lp of cleanLocal) {
      const key = lp.id || lp.code;
      if (!key) continue;
      const sp = mergedMap.get(key) || (lp.code ? mergedMap.get(lp.code) : undefined);
      if (sp) {
        const localTime = lp.updatedAt ? new Date(lp.updatedAt).getTime() : 0;
        const serverTime = sp.updatedAt ? new Date(sp.updatedAt).getTime() : 0;
        if (localTime > serverTime) {
          mergedMap.set(key, lp);
          toPushToServer.push(lp);
        }
      } else {
        mergedMap.set(key, lp);
      }
    }

    if (toPushToServer.length > 0 && pushMissingToServer) {
      console.warn(`[LOCAL_VAULT] Reconciling ${toPushToServer.length} locally updated/missing 5% land parcels back to server...`);
      try {
        await pushMissingToServer(toPushToServer);
      } catch (e) {
        console.error('[LOCAL_VAULT] Error syncing public lands to server:', e);
      }
    }

    const merged = Array.from(mergedMap.values());
    await this.savePublicLandsLocally(merged);
    return merged;
  }

  // ================= VIOLATIONS VAULT =================
  public async saveViolationsLocally(items: LandViolationCase[]): Promise<void> {
    if (!Array.isArray(items)) return;
    this.violationMemoryCache = items;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_VIOLATIONS_KEY, JSON.stringify(items));
      }
    } catch (_) {}

    try {
      const db = await this.initDB();
      if (!db) return;
      const tx = db.transaction([VIOLATIONS_STORE], 'readwrite');
      const store = tx.objectStore(VIOLATIONS_STORE);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    } catch (_) {}
  }

  public async upsertLocalViolation(violation: LandViolationCase): Promise<void> {
    if (!violation || !violation.id) return;
    const current = await this.loadViolationsLocally();
    const index = current.findIndex((v) => v.id === violation.id || (violation.code && v.code === violation.code));
    if (index >= 0) {
      current[index] = { ...current[index], ...violation };
    } else {
      current.unshift(violation);
    }
    await this.saveViolationsLocally(current);
  }

  public async deleteLocalViolation(id: string, code?: string): Promise<void> {
    const current = await this.loadViolationsLocally();
    const filtered = current.filter((v) => v.id !== id && (!code || v.code !== code));
    this.violationMemoryCache = filtered;
    await this.saveViolationsLocally(filtered);
  }

  public async loadViolationsLocally(): Promise<LandViolationCase[]> {
    if (this.violationMemoryCache && this.violationMemoryCache.length > 0) {
      return this.violationMemoryCache;
    }
    try {
      const db = await this.initDB();
      if (db) {
        const list = await new Promise<LandViolationCase[]>((resolve) => {
          try {
            const tx = db.transaction(VIOLATIONS_STORE, 'readonly');
            const store = tx.objectStore(VIOLATIONS_STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch (_) {
            resolve([]);
          }
        });
        if (list && list.length > 0) {
          this.violationMemoryCache = list;
          return list;
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_VIOLATIONS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.violationMemoryCache = parsed;
            return parsed;
          }
        }
      }
    } catch (_) {}
    return [];
  }

  public async reconcileViolationsWithServer(
    serverItems: LandViolationCase[],
    pushMissingToServer?: (missing: LandViolationCase[]) => Promise<void>,
    serverDeleted?: LandViolationCase[]
  ): Promise<LandViolationCase[]> {
    const local = await this.loadViolationsLocally();
    const serverSafe = Array.isArray(serverItems) ? serverItems : [];
    const serverSafeIds = new Set(serverSafe.map((item) => item.id));
    const serverSafeCodes = new Set(serverSafe.map((item) => item.code).filter(Boolean));

    // Only consider deleted if not present in active serverSafe
    const deletedIds = new Set(
      (serverDeleted || []).map((d) => d.id).filter((id) => !serverSafeIds.has(id))
    );
    const deletedCodes = new Set(
      (serverDeleted || []).map((d) => d.code).filter((c) => Boolean(c) && !serverSafeCodes.has(c))
    );

    const cleanLocal = local.filter((item) => !deletedIds.has(item.id) && (!item.code || !deletedCodes.has(item.code)));
    const serverIds = serverSafeIds;
    const serverCodes = serverSafeCodes;

    const missingOnServer = cleanLocal.filter(
      (item) => !serverIds.has(item.id) && (!item.code || !serverCodes.has(item.code))
    );

    const toPushToServer: LandViolationCase[] = [...missingOnServer];
    const mergedMap = new Map<string, LandViolationCase>();

    for (const sv of serverSafe) {
      const key = sv.id || sv.code;
      if (key) mergedMap.set(key, sv);
    }

    for (const lv of cleanLocal) {
      const key = lv.id || lv.code;
      if (!key) continue;
      const sv = mergedMap.get(key) || (lv.code ? mergedMap.get(lv.code) : undefined);
      if (sv) {
        const localTime = lv.updatedAt ? new Date(lv.updatedAt).getTime() : 0;
        const serverTime = sv.updatedAt ? new Date(sv.updatedAt).getTime() : 0;
        if (localTime > serverTime) {
          mergedMap.set(key, lv);
          toPushToServer.push(lv);
        }
      } else {
        mergedMap.set(key, lv);
      }
    }

    if (toPushToServer.length > 0 && pushMissingToServer) {
      console.warn(`[LOCAL_VAULT] Reconciling ${toPushToServer.length} local updated/missing violations back to server...`);
      try {
        await pushMissingToServer(toPushToServer);
      } catch (e) {
        console.error('[LOCAL_VAULT] Error syncing violations to server:', e);
      }
    }

    const merged = Array.from(mergedMap.values());
    await this.saveViolationsLocally(merged);
    return merged;
  }

  // ================= DISPUTES VAULT =================
  public async saveDisputesLocally(items: DisputeCase[]): Promise<void> {
    if (!Array.isArray(items)) return;
    this.disputeMemoryCache = items;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_DISPUTES_KEY, JSON.stringify(items));
      }
    } catch (_) {}

    try {
      const db = await this.initDB();
      if (!db) return;
      const tx = db.transaction([DISPUTES_STORE], 'readwrite');
      const store = tx.objectStore(DISPUTES_STORE);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    } catch (_) {}
  }

  public async upsertLocalDispute(dispute: DisputeCase): Promise<void> {
    if (!dispute || !dispute.id) return;
    const current = await this.loadDisputesLocally();
    const index = current.findIndex((d) => d.id === dispute.id || (dispute.code && d.code === dispute.code));
    if (index >= 0) {
      current[index] = { ...current[index], ...dispute };
    } else {
      current.unshift(dispute);
    }
    await this.saveDisputesLocally(current);
  }

  public async deleteLocalDispute(id: string, code?: string): Promise<void> {
    const current = await this.loadDisputesLocally();
    const filtered = current.filter((d) => d.id !== id && (!code || d.code !== code));
    this.disputeMemoryCache = filtered;
    await this.saveDisputesLocally(filtered);
  }

  public async loadDisputesLocally(): Promise<DisputeCase[]> {
    if (this.disputeMemoryCache && this.disputeMemoryCache.length > 0) {
      return this.disputeMemoryCache;
    }
    try {
      const db = await this.initDB();
      if (db) {
        const list = await new Promise<DisputeCase[]>((resolve) => {
          try {
            const tx = db.transaction(DISPUTES_STORE, 'readonly');
            const store = tx.objectStore(DISPUTES_STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch (_) {
            resolve([]);
          }
        });
        if (list && list.length > 0) {
          this.disputeMemoryCache = list;
          return list;
        }
      }
    } catch (_) {}

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(LOCAL_STORAGE_DISPUTES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.disputeMemoryCache = parsed;
            return parsed;
          }
        }
      }
    } catch (_) {}
    return [];
  }

  public async reconcileDisputesWithServer(
    serverItems: DisputeCase[],
    pushMissingToServer?: (missing: DisputeCase[]) => Promise<void>,
    serverDeleted?: DisputeCase[]
  ): Promise<DisputeCase[]> {
    const local = await this.loadDisputesLocally();
    const serverSafe = Array.isArray(serverItems) ? serverItems : [];
    const serverSafeIds = new Set(serverSafe.map((item) => item.id));
    const serverSafeCodes = new Set(serverSafe.map((item) => item.code).filter(Boolean));

    // Only consider deleted if not present in active serverSafe
    const deletedIds = new Set(
      (serverDeleted || []).map((d) => d.id).filter((id) => !serverSafeIds.has(id))
    );
    const deletedCodes = new Set(
      (serverDeleted || []).map((d) => d.code).filter((c) => Boolean(c) && !serverSafeCodes.has(c))
    );

    const cleanLocal = local.filter((item) => !deletedIds.has(item.id) && (!item.code || !deletedCodes.has(item.code)));
    const serverIds = serverSafeIds;
    const serverCodes = serverSafeCodes;

    const missingOnServer = cleanLocal.filter(
      (item) => !serverIds.has(item.id) && (!item.code || !serverCodes.has(item.code))
    );

    const toPushToServer: DisputeCase[] = [...missingOnServer];
    const mergedMap = new Map<string, DisputeCase>();

    for (const sd of serverSafe) {
      const key = sd.id || sd.code;
      if (key) mergedMap.set(key, sd);
    }

    for (const ld of cleanLocal) {
      const key = ld.id || ld.code;
      if (!key) continue;
      const sd = mergedMap.get(key) || (ld.code ? mergedMap.get(ld.code) : undefined);
      if (sd) {
        const localTime = ld.updatedAt ? new Date(ld.updatedAt).getTime() : 0;
        const serverTime = sd.updatedAt ? new Date(sd.updatedAt).getTime() : 0;
        if (localTime > serverTime) {
          mergedMap.set(key, ld);
          toPushToServer.push(ld);
        }
      } else {
        mergedMap.set(key, ld);
      }
    }

    if (toPushToServer.length > 0 && pushMissingToServer) {
      console.warn(`[LOCAL_VAULT] Reconciling ${toPushToServer.length} local updated/missing dispute cases back to server...`);
      try {
        await pushMissingToServer(toPushToServer);
      } catch (e) {
        console.error('[LOCAL_VAULT] Error syncing disputes to server:', e);
      }
    }

    const merged = Array.from(mergedMap.values());
    await this.saveDisputesLocally(merged);
    return merged;
  }

  /**
   * Export all dossiers to a downloadable JSON file as emergency backup
   */
  public exportBackupJson(dossiers: Dossier[]): void {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;
      const filename = `Sao_Luu_Ho_So_Dat_Dai_Danang_${dateStr}_${timeStr}.json`;

      const backupPayload = {
        app: 'QuanLyCongViecVaHoSoDatDai_Danang',
        version: '1.0',
        exportedAt: now.toISOString(),
        totalDossiers: dossiers.length,
        dossiers,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('[LOCAL_VAULT] Error exporting backup json:', e);
    }
  }

  /**
   * Read and parse a JSON backup file
   */
  public async parseBackupFile(file: File): Promise<Dossier[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parsed = JSON.parse(text);
          let list: Dossier[] = [];
          if (Array.isArray(parsed)) {
            list = parsed;
          } else if (parsed && Array.isArray(parsed.dossiers)) {
            list = parsed.dossiers;
          } else {
            throw new Error('Định dạng file sao lưu không hợp lệ (không tìm thấy danh sách hồ sơ).');
          }
          resolve(list);
        } catch (err: any) {
          reject(new Error('Lỗi đọc file sao lưu JSON: ' + (err?.message || 'File không đúng cấu trúc.')));
        }
      };
      reader.onerror = () => reject(new Error('Lỗi khi đọc file từ máy tính.'));
      reader.readAsText(file);
    });
  }

  public backupRegisterBooks(books: any[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      if (Array.isArray(books) && books.length > 0) {
        window.localStorage.setItem(LOCAL_STORAGE_REGISTER_BOOKS_KEY, JSON.stringify(books));
      }
    } catch (_) {}
  }

  public getRegisterBooksBackup(): any[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_REGISTER_BOOKS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  /**
   * Return formatted string of last local save
   */
  public getLastLocalSavedTime(): string {
    if (typeof window === 'undefined' || !window.localStorage) return '';
    const ts = window.localStorage.getItem(LOCAL_STORAGE_TIMESTAMP_KEY);
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch (e) {
      return '';
    }
  }
}

export const localVault = new LocalVaultService();
