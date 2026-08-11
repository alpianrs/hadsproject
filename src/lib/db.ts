import { INITIAL_PACKAGES, INITIAL_PORTFOLIO, INITIAL_REVIEWS, DEFAULT_STUDIO_SETTINGS } from './seedData';
import { sendToGoogleSheets } from './googleSheets';
import { UserProfile, StudioSettings, Booking, PackageItem, PortfolioItem, Review, BlockedSlot, AppNotification, ChatMessage } from '../types';

// Custom Event Emitter for Real-Time Collection Listeners
const dbEmitter = new EventTarget();

const STORAGE_PREFIX = 'hadsproject_db_';

// Helper to get collection items from localStorage
export function getCollectionFromStorage<T = any>(collectionName: string): T[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + collectionName);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading collection ${collectionName}:`, err);
    return [];
  }
}

// Helper to save collection items to localStorage and notify listeners
export function saveCollectionToStorage<T = any>(collectionName: string, items: T[]) {
  try {
    localStorage.setItem(STORAGE_PREFIX + collectionName, JSON.stringify(items));
    dbEmitter.dispatchEvent(new CustomEvent('change:' + collectionName, { detail: items }));
    
    // Auto sync to Google Sheets if AppScript URL is available
    triggerGoogleSheetsSync(collectionName, items);
  } catch (err) {
    console.error(`Error saving collection ${collectionName}:`, err);
  }
}

// Auto sync helper to Google Sheets
let syncTimeout: any = null;
function triggerGoogleSheetsSync(collectionName: string, items: any[]) {
  const settingsList = getCollectionFromStorage<StudioSettings>('settings');
  const settings = settingsList[0] || DEFAULT_STUDIO_SETTINGS;
  const webAppUrl = settings.googleSheetsAppScriptUrl;

  if (!webAppUrl || !webAppUrl.trim()) return;

  // Debounce sync calls
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    if (collectionName === 'bookings') {
      sendToGoogleSheets(webAppUrl, 'sync_all_bookings', items);
    } else {
      sendToGoogleSheets(webAppUrl, 'sync_all_data', {
        bookings: getCollectionFromStorage('bookings'),
        packages: getCollectionFromStorage('packages'),
        blockedSlots: getCollectionFromStorage('blockedSlots'),
        reviews: getCollectionFromStorage('reviews'),
        settings
      });
    }
  }, 1000);
}

// Initialize seed data if empty
export function initLocalDatabase() {
  if (!localStorage.getItem(STORAGE_PREFIX + 'packages')) {
    saveCollectionToStorage('packages', INITIAL_PACKAGES);
  }
  if (!localStorage.getItem(STORAGE_PREFIX + 'portfolio')) {
    saveCollectionToStorage('portfolio', INITIAL_PORTFOLIO);
  }
  if (!localStorage.getItem(STORAGE_PREFIX + 'reviews')) {
    saveCollectionToStorage('reviews', INITIAL_REVIEWS);
  }

  const existingSettingsRaw = localStorage.getItem(STORAGE_PREFIX + 'settings');
  let currentSettings: StudioSettings = DEFAULT_STUDIO_SETTINGS;

  if (!existingSettingsRaw) {
    saveCollectionToStorage('settings', [DEFAULT_STUDIO_SETTINGS]);
  } else {
    try {
      const parsedList = JSON.parse(existingSettingsRaw);
      const s = parsedList[0] || {};
      if (!s.googleSheetsAppScriptUrl || !s.googleSheetsAppScriptUrl.trim()) {
        currentSettings = { ...DEFAULT_STUDIO_SETTINGS, ...s, googleSheetsAppScriptUrl: DEFAULT_STUDIO_SETTINGS.googleSheetsAppScriptUrl };
        saveCollectionToStorage('settings', [currentSettings]);
      } else {
        currentSettings = { ...DEFAULT_STUDIO_SETTINGS, ...s };
      }
    } catch {
      saveCollectionToStorage('settings', [DEFAULT_STUDIO_SETTINGS]);
    }
  }

  // Trigger immediate initial data push to Google Sheets
  if (currentSettings.googleSheetsAppScriptUrl) {
    setTimeout(() => {
      sendToGoogleSheets(currentSettings.googleSheetsAppScriptUrl, 'sync_all_data', {
        bookings: getCollectionFromStorage('bookings'),
        packages: getCollectionFromStorage('packages'),
        blockedSlots: getCollectionFromStorage('blockedSlots'),
        reviews: getCollectionFromStorage('reviews'),
        settings: currentSettings
      });
    }, 500);
  }
}

// Run DB Initialization immediately
initLocalDatabase();

// --- FIRESTORE API REPLACEMENT SHIMS ---
export const db = { type: 'google-sheets-local-db' };

export function collection(dbRef: any, path: string) {
  return path;
}

export function doc(dbRef: any, path: string, docId?: string) {
  if (typeof dbRef === 'string') {
    return { collectionName: dbRef, id: path };
  }
  return { collectionName: path, id: docId || 'doc_' + Math.random().toString(36).substring(2, 9) };
}

export async function getDoc(docRef: any) {
  let colName = typeof docRef === 'string' ? docRef : docRef.collectionName;
  let id = typeof docRef === 'object' ? docRef.id : undefined;

  if (colName === 'settings' || id === 'global') {
    const list = getCollectionFromStorage<StudioSettings>('settings');
    const data = list[0] || DEFAULT_STUDIO_SETTINGS;
    return {
      exists: () => true,
      data: () => data,
      id: 'global'
    };
  }

  const list = getCollectionFromStorage(colName);
  const found = list.find((item: any) => item.id === id || item.uid === id);

  return {
    exists: () => !!found,
    data: () => found || null,
    id: id || ''
  };
}

export async function getDocs(queryOrCol: any) {
  const colName = typeof queryOrCol === 'string' ? queryOrCol : (queryOrCol.collectionName || 'packages');
  const items = getCollectionFromStorage(colName);

  return {
    empty: items.length === 0,
    docs: items.map((item) => ({
      id: item.id || item.uid,
      data: () => item
    })),
    forEach: (callback: (d: any) => void) => {
      items.forEach((item) => {
        callback({
          id: item.id || item.uid,
          data: () => item
        });
      });
    }
  };
}

export async function setDoc(docRef: any, data: any, options?: { merge?: boolean }) {
  const colName = docRef.collectionName;
  const id = docRef.id;

  if (colName === 'settings' || id === 'global') {
    const currentList = getCollectionFromStorage<StudioSettings>('settings');
    const existing = currentList[0] || DEFAULT_STUDIO_SETTINGS;
    const merged = options?.merge ? { ...existing, ...data } : { ...DEFAULT_STUDIO_SETTINGS, ...data };
    saveCollectionToStorage('settings', [merged]);
    return;
  }

  let list = getCollectionFromStorage(colName);
  const index = list.findIndex((item: any) => item.id === id || item.uid === id);

  const newItem = { id: id || itemKey(data), ...data };
  if (index >= 0) {
    if (options?.merge) {
      list[index] = { ...list[index], ...data };
    } else {
      list[index] = newItem;
    }
  } else {
    list.push(newItem);
  }

  saveCollectionToStorage(colName, list);
}

export async function addDoc(collectionPath: string, data: any) {
  const colName = typeof collectionPath === 'string' ? collectionPath : collectionPath;
  const id = data.id || 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newItem = { ...data, id };

  const list = getCollectionFromStorage(colName);
  list.push(newItem);
  saveCollectionToStorage(colName, list);

  return { id };
}

export async function updateDoc(docRef: any, data: any) {
  const colName = docRef.collectionName;
  const id = docRef.id;

  let list = getCollectionFromStorage(colName);
  const index = list.findIndex((item: any) => item.id === id || item.uid === id);

  if (index >= 0) {
    list[index] = { ...list[index], ...data };
    saveCollectionToStorage(colName, list);
  }
}

export async function deleteDoc(docRef: any) {
  const colName = docRef.collectionName;
  const id = docRef.id;

  let list = getCollectionFromStorage(colName);
  list = list.filter((item: any) => item.id !== id && item.uid !== id);
  saveCollectionToStorage(colName, list);
}

export function query(colName: any, ...clauses: any[]) {
  return colName;
}

export function where(field: string, op: string, value: any) {
  return { field, op, value };
}

export function orderBy(field: string, direction?: 'asc' | 'desc') {
  return { field, direction };
}

export function onSnapshot(target: any, callback: (snap: any) => void) {
  let colName = typeof target === 'string' ? target : (target.collectionName || 'packages');
  let singleDocId = typeof target === 'object' && target.id ? target.id : null;

  const emitData = () => {
    if (colName === 'settings' || singleDocId === 'global') {
      const list = getCollectionFromStorage<StudioSettings>('settings');
      const data = list[0] || DEFAULT_STUDIO_SETTINGS;
      callback({
        exists: () => true,
        data: () => data,
        id: 'global'
      });
      return;
    }

    if (singleDocId) {
      const list = getCollectionFromStorage(colName);
      const found = list.find((i: any) => i.id === singleDocId || i.uid === singleDocId);
      callback({
        exists: () => !!found,
        data: () => found || null,
        id: singleDocId
      });
      return;
    }

    const items = getCollectionFromStorage(colName);
    callback({
      empty: items.length === 0,
      docs: items.map((item: any) => ({
        id: item.id || item.uid,
        data: () => item
      })),
      forEach: (fn: (d: any) => void) => {
        items.forEach((item: any) => {
          fn({
            id: item.id || item.uid,
            data: () => item
          });
        });
      }
    });
  };

  // Initial call
  emitData();

  // Subscribe to changes
  const listener = () => emitData();
  dbEmitter.addEventListener('change:' + colName, listener);

  return () => {
    dbEmitter.removeEventListener('change:' + colName, listener);
  };
}

function itemKey(item: any) {
  return item.id || item.uid || 'item_' + Math.random().toString(36).substring(2, 8);
}

// --- AUTHENTICATION REPLACEMENT SHIMS ---
const AUTH_STORAGE_KEY = 'hadsproject_current_user';
const authListeners = new Set<(user: UserProfile | null) => void>();

export const auth = {
  get currentUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
};

export function onAuthStateChanged(authObj: any, callback: (user: UserProfile | null) => void) {
  const notify = () => {
    const current = auth.currentUser;
    callback(current);
  };

  notify();
  authListeners.add(callback);

  return () => {
    authListeners.delete(callback);
  };
}

export function setCurrentUserSession(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  authListeners.forEach((fn) => fn(user));
}

export async function firebaseSignOut(authObj?: any) {
  setCurrentUserSession(null);
}

export async function signInWithEmailAndPassword(authObj: any, email: string, pass: string) {
  const users = getCollectionFromStorage<UserProfile>('users');
  let found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!found) {
    const uid = 'usr_' + Date.now();
    found = {
      uid,
      email,
      displayName: email.split('@')[0],
      role: email.toLowerCase().trim() === 'creative.hadsproject@gmail.com' ? 'admin' : 'customer',
      createdAt: new Date().toISOString()
    };
    users.push(found);
    saveCollectionToStorage('users', users);
  }

  setCurrentUserSession(found);
  return { user: { uid: found.uid, email: found.email, displayName: found.displayName } };
}

export async function createUserWithEmailAndPassword(authObj: any, email: string, pass: string) {
  const users = getCollectionFromStorage<UserProfile>('users');
  let found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!found) {
    const uid = 'usr_' + Date.now();
    found = {
      uid,
      email,
      displayName: email.split('@')[0],
      role: email.toLowerCase().trim() === 'creative.hadsproject@gmail.com' ? 'admin' : 'customer',
      createdAt: new Date().toISOString()
    };
    users.push(found);
    saveCollectionToStorage('users', users);
  }

  setCurrentUserSession(found);
  return { user: { uid: found.uid, email: found.email, displayName: found.displayName } };
}

export async function updateProfile(fbUser: any, data: { displayName?: string; photoURL?: string }) {
  const current = auth.currentUser;
  if (current) {
    const updated = {
      ...current,
      displayName: data.displayName || current.displayName,
      photoURL: data.photoURL || current.photoURL
    };
    setCurrentUserSession(updated);

    const users = getCollectionFromStorage<UserProfile>('users');
    const index = users.findIndex((u) => u.uid === current.uid);
    if (index >= 0) {
      users[index] = { ...users[index], ...updated };
      saveCollectionToStorage('users', users);
    }
  }
}

export async function signInWithPopup(authObj: any, provider: any, targetEmail?: string, targetName?: string) {
  let userEmail = targetEmail?.trim();
  if (!userEmail) {
    const input = prompt('Masukkan Email Google / Gmail Pribadi Anda (Contoh: nama@gmail.com):', '');
    if (!input || !input.trim()) {
      throw new Error('Login Google dibatalkan. Silakan masukkan email Google Anda.');
    }
    userEmail = input.trim();
  }

  const users = getCollectionFromStorage<UserProfile>('users');
  let found = users.find((u) => u.email.toLowerCase() === userEmail.toLowerCase());

  if (!found) {
    const uid = 'goog_' + Date.now();
    found = {
      uid,
      email: userEmail,
      displayName: targetName || userEmail.split('@')[0],
      role: userEmail.toLowerCase().trim() === 'creative.hadsproject@gmail.com' ? 'admin' : 'customer',
      createdAt: new Date().toISOString()
    };
    users.push(found);
    saveCollectionToStorage('users', users);
  }

  setCurrentUserSession(found);

  return {
    user: {
      uid: found.uid,
      email: found.email,
      displayName: found.displayName,
      phoneNumber: found.phoneNumber || '',
      photoURL: found.photoURL || ''
    }
  };
}

export const googleProvider = {};
export const Timestamp = {
  now: () => ({ toISOString: () => new Date().toISOString() })
};
export const serverTimestamp = () => new Date().toISOString();
