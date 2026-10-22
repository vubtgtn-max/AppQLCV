import { IStorageEngine } from './types';
import { JsonFileStorageEngine } from './JsonFileStorageEngine';
import { FirestoreStorageEngine } from './FirestoreStorageEngine';

export * from './types';
export { JsonFileStorageEngine } from './JsonFileStorageEngine';
export { FirestoreStorageEngine } from './FirestoreStorageEngine';

export class StorageEngineFactory {
  private static instance: IStorageEngine | null = null;

  public static getEngine(forceEngine?: 'json' | 'firestore'): IStorageEngine {
    if (forceEngine === 'firestore') {
      // In Phase 3B-1.5, Firestore is explicitly BLOCKED from production initialization
      throw new Error('[STORAGE_FACTORY_BLOCKED] FirestoreStorageEngine is not activated for Phase 3B-1.5.');
    }

    if (this.instance) {
      return this.instance;
    }

    this.instance = new JsonFileStorageEngine();
    return this.instance;
  }

  public static resetForTesting(engine?: IStorageEngine): void {
    this.instance = engine || null;
  }
}

export const defaultStorageEngine = StorageEngineFactory.getEngine('json');
