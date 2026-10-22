/// <reference types="vite/client" />
/**
 * Firebase Client Configuration & Helper Service
 * Cấu hình kết nối Firebase Firestore & Authentication & Storage
 */

import firebaseAppletConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: firebaseAppletConfig.apiKey || (import.meta as any).env?.VITE_FIREBASE_API_KEY || '',
  authDomain: firebaseAppletConfig.authDomain || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: firebaseAppletConfig.projectId || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: firebaseAppletConfig.storageBucket || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: firebaseAppletConfig.messagingSenderId || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: firebaseAppletConfig.appId || (import.meta as any).env?.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId: firebaseAppletConfig.firestoreDatabaseId || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  TASKS: 'tasks',
  DOSSIERS: 'dossiers',
  PROJECTS: 'projects',
  PUBLIC_LANDS: 'publicLands',
  VIOLATIONS: 'violations',
  DISPUTES: 'disputes',
  CALENDAR_EVENTS: 'calendarEvents',
  REGISTER_BOOKS: 'registerBooks',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
  ACTIVITY_LOGS: 'activityLogs',
  SETTINGS: 'settings',
} as const;
