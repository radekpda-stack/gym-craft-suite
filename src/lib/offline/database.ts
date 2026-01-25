/**
 * Offline Database using IndexedDB
 * Handles local storage for trainings, exercises, and sync queue
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema types
interface OfflineTraining {
  id: string;
  localId: string; // Unique local identifier
  sessionId: string | null;
  clientId: string;
  clientName: string;
  exercises: OfflineExercise[];
  status: 'draft' | 'pending_sync' | 'synced' | 'failed';
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  syncError?: string;
}

interface OfflineExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sets: OfflineSet[];
  notes?: string;
  rpe?: number;
}

interface OfflineSet {
  id: string;
  setNumber: number;
  weight?: number;
  reps?: number;
  duration?: number;
  distance?: number;
  completed: boolean;
}

interface SyncQueueItem {
  id: string;
  type: 'create_training' | 'update_training' | 'add_exercise' | 'update_exercise' | 'delete_exercise';
  payload: unknown;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}

interface CachedClient {
  id: string;
  name: string;
  email?: string;
  creditBalance?: number;
  updatedAt: string;
}

interface CachedExercise {
  id: string;
  name: string;
  category?: string;
  metricType?: string;
  updatedAt: string;
}

interface CachedPR {
  id: string;
  clientId: string;
  exerciseId: string;
  exerciseName: string;
  metric: 'weight' | 'reps' | 'duration' | 'distance';
  value: number;
  unit: string;
  achievedAt: string;
  updatedAt: string;
}

interface OfflineDBSchema extends DBSchema {
  trainings: {
    key: string;
    value: OfflineTraining;
    indexes: {
      'by-status': string;
      'by-client': string;
      'by-updated': string;
    };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-created': string;
      'by-type': string;
    };
  };
  clients: {
    key: string;
    value: CachedClient;
    indexes: {
      'by-name': string;
    };
  };
  exercises: {
    key: string;
    value: CachedExercise;
    indexes: {
      'by-name': string;
      'by-category': string;
    };
  };
  personalRecords: {
    key: string;
    value: CachedPR;
    indexes: {
      'by-client': string;
      'by-exercise': string;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: unknown;
      updatedAt: string;
    };
  };
}

const DB_NAME = 'justmove-offline';
const DB_VERSION = 2; // Incremented for PR cache

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

/**
 * Get or create the database instance
 */
async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Trainings store
      if (!db.objectStoreNames.contains('trainings')) {
        const trainingsStore = db.createObjectStore('trainings', { keyPath: 'localId' });
        trainingsStore.createIndex('by-status', 'status');
        trainingsStore.createIndex('by-client', 'clientId');
        trainingsStore.createIndex('by-updated', 'updatedAt');
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-created', 'createdAt');
        syncStore.createIndex('by-type', 'type');
      }

      // Clients cache store
      if (!db.objectStoreNames.contains('clients')) {
        const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
        clientsStore.createIndex('by-name', 'name');
      }

      // Exercises cache store
      if (!db.objectStoreNames.contains('exercises')) {
        const exercisesStore = db.createObjectStore('exercises', { keyPath: 'id' });
        exercisesStore.createIndex('by-name', 'name');
        exercisesStore.createIndex('by-category', 'category');
      }

      // Personal Records cache store
      if (!db.objectStoreNames.contains('personalRecords')) {
        const prStore = db.createObjectStore('personalRecords', { keyPath: 'id' });
        prStore.createIndex('by-client', 'clientId');
        prStore.createIndex('by-exercise', 'exerciseId');
      }

      // Metadata store for general settings
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ============ TRAININGS ============

export async function saveOfflineTraining(training: OfflineTraining): Promise<void> {
  const db = await getDB();
  await db.put('trainings', {
    ...training,
    updatedAt: new Date().toISOString(),
  });
}

export async function getOfflineTraining(localId: string): Promise<OfflineTraining | undefined> {
  const db = await getDB();
  return db.get('trainings', localId);
}

export async function getAllOfflineTrainings(): Promise<OfflineTraining[]> {
  const db = await getDB();
  return db.getAll('trainings');
}

export async function getPendingSyncTrainings(): Promise<OfflineTraining[]> {
  const db = await getDB();
  return db.getAllFromIndex('trainings', 'by-status', 'pending_sync');
}

export async function deleteOfflineTraining(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('trainings', localId);
}

export async function markTrainingAsSynced(localId: string, serverId: string): Promise<void> {
  const db = await getDB();
  const training = await db.get('trainings', localId);
  if (training) {
    training.id = serverId;
    training.status = 'synced';
    training.syncedAt = new Date().toISOString();
    await db.put('trainings', training);
  }
}

export async function markTrainingAsFailed(localId: string, error: string): Promise<void> {
  const db = await getDB();
  const training = await db.get('trainings', localId);
  if (training) {
    training.status = 'failed';
    training.syncError = error;
    await db.put('trainings', training);
  }
}

// ============ SYNC QUEUE ============

export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts'>): Promise<string> {
  const db = await getDB();
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.put('syncQueue', {
    ...item,
    id,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  return id;
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('syncQueue', 'by-created');
}

export async function updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    await db.put('syncQueue', { ...item, ...updates });
  }
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear('syncQueue');
}

// ============ CLIENTS CACHE ============

export async function cacheClients(clients: CachedClient[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('clients', 'readwrite');
  await Promise.all([
    ...clients.map(client => tx.store.put({
      ...client,
      updatedAt: new Date().toISOString(),
    })),
    tx.done,
  ]);
}

export async function getCachedClients(): Promise<CachedClient[]> {
  const db = await getDB();
  return db.getAll('clients');
}

export async function getCachedClient(id: string): Promise<CachedClient | undefined> {
  const db = await getDB();
  return db.get('clients', id);
}

// ============ EXERCISES CACHE ============

export async function cacheExercises(exercises: CachedExercise[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('exercises', 'readwrite');
  await Promise.all([
    ...exercises.map(exercise => tx.store.put({
      ...exercise,
      updatedAt: new Date().toISOString(),
    })),
    tx.done,
  ]);
}

export async function getCachedExercises(): Promise<CachedExercise[]> {
  const db = await getDB();
  return db.getAll('exercises');
}

export async function searchCachedExercises(query: string): Promise<CachedExercise[]> {
  const db = await getDB();
  const all = await db.getAll('exercises');
  const lowerQuery = query.toLowerCase();
  return all.filter(e => e.name.toLowerCase().includes(lowerQuery));
}

// ============ PERSONAL RECORDS CACHE ============

export async function cachePRs(prs: CachedPR[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('personalRecords', 'readwrite');
  await Promise.all([
    ...prs.map(pr => tx.store.put({
      ...pr,
      updatedAt: new Date().toISOString(),
    })),
    tx.done,
  ]);
}

export async function getCachedPRs(): Promise<CachedPR[]> {
  const db = await getDB();
  return db.getAll('personalRecords');
}

export async function getCachedPRsByClient(clientId: string): Promise<CachedPR[]> {
  const db = await getDB();
  return db.getAllFromIndex('personalRecords', 'by-client', clientId);
}

export async function getCachedPRsByExercise(exerciseId: string): Promise<CachedPR[]> {
  const db = await getDB();
  return db.getAllFromIndex('personalRecords', 'by-exercise', exerciseId);
}

// ============ METADATA ============

export async function setMetadata(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('metadata', {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}

export async function getMetadata<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const item = await db.get('metadata', key);
  return item?.value as T | undefined;
}

// ============ UTILITIES ============

export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('trainings'),
    db.clear('syncQueue'),
    db.clear('clients'),
    db.clear('exercises'),
    db.clear('personalRecords'),
    db.clear('metadata'),
  ]);
}

export async function getOfflineStats(): Promise<{
  pendingTrainings: number;
  syncQueueItems: number;
  cachedClients: number;
  cachedExercises: number;
  cachedPRs: number;
}> {
  const db = await getDB();
  const [pendingTrainings, syncQueueItems, cachedClients, cachedExercises, cachedPRs] = await Promise.all([
    db.countFromIndex('trainings', 'by-status', 'pending_sync'),
    db.count('syncQueue'),
    db.count('clients'),
    db.count('exercises'),
    db.count('personalRecords'),
  ]);
  return { pendingTrainings, syncQueueItems, cachedClients, cachedExercises, cachedPRs };
}

// Export types
export type { 
  OfflineTraining, 
  OfflineExercise, 
  OfflineSet, 
  SyncQueueItem, 
  CachedClient, 
  CachedExercise,
  CachedPR,
};
