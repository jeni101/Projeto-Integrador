const DB_NAME = 'phorta-dashboard';
const DB_VERSION = 1;
const STORE_NAME = 'telemetry';
const CACHE_KEY = 'snapshot';
const LS_SNAPSHOT_KEY = 'phorta-snapshot';
export const SESSION_STORAGE_KEY = 'phorta-session';
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(CACHE_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, CACHE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDelete(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(CACHE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function lerLocalStorageSnapshot() {
  try {
    const raw = localStorage.getItem(LS_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function gravarLocalStorageSnapshot(snapshot) {
  try {
    localStorage.setItem(LS_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Cache localStorage save failed:', err.message);
  }
}

function removerLocalStorageSnapshot() {
  try {
    localStorage.removeItem(LS_SNAPSHOT_KEY);
  } catch { /* ignore */ }
}

export function snapshotExpirado(snapshot, ttlMs = CACHE_TTL_MS) {
  if (!snapshot?.fetchedAt) return true;
  return Date.now() - snapshot.fetchedAt > ttlMs;
}

export function formatarIdadeCache(fetchedAt) {
  if (!fetchedAt) return '';
  const mins = Math.floor((Date.now() - fetchedAt) / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins} min`;
  const horas = Math.floor(mins / 60);
  return `${horas}h`;
}

export async function salvarCacheSnapshot(payload) {
  const snapshot = {
    telemetria: payload.telemetria,
    historico: payload.historico,
    cenario: payload.cenario,
    fetchedAt: payload.fetchedAt ?? Date.now(),
  };

  try {
    const db = await openDb();
    await idbPut(db, snapshot);
    db.close();
  } catch (err) {
    console.warn('Cache IndexedDB save failed, using localStorage:', err.message);
    gravarLocalStorageSnapshot(snapshot);
  }
}

export async function carregarCacheSnapshot() {
  let snapshot = null;

  try {
    const db = await openDb();
    snapshot = await idbGet(db);
    db.close();
  } catch {
    snapshot = lerLocalStorageSnapshot();
  }

  if (!snapshot) {
    snapshot = lerLocalStorageSnapshot();
  }

  if (!snapshot || snapshotExpirado(snapshot)) {
    if (snapshot) await limparCacheSnapshot();
    return null;
  }

  return snapshot;
}

export async function limparCacheSnapshot() {
  try {
    const db = await openDb();
    await idbDelete(db);
    db.close();
  } catch { /* ignore */ }
  removerLocalStorageSnapshot();
}

export function salvarSessaoLocal(dados) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dados));
  } catch (err) {
    console.warn('Session save failed:', err.message);
  }
}

export function carregarSessaoLocal() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function toCachedResponse(snapshot) {
  const base = (snapshot.cenario || 'normal').replace(/-cached$/, '');
  return {
    telemetria: snapshot.telemetria,
    historico: snapshot.historico,
    cenario: `${base}-cached`,
    fetchedAt: snapshot.fetchedAt,
    fromCache: true,
  };
}
