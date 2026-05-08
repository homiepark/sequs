import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getDatabase,
  Database,
  ref,
  onValue,
  set,
  update,
  DatabaseReference,
} from "firebase/database";
import type { DB } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyChNw0VDTrTau5AJfEEgS323-xk7mAJKvs",
  authDomain: "movement-4a23f.firebaseapp.com",
  databaseURL: "https://movement-4a23f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "movement-4a23f",
  storageBucket: "movement-4a23f.firebasestorage.app",
  messagingSenderId: "553989031192",
  appId: "1:553989031192:web:a5c6397fc33bb24e75ca6d",
};

const DB_PATH = "ptcenter";

let app: FirebaseApp | null = null;
let database: Database | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") throw new Error("Firebase is client-only");
  if (!app) {
    app = getApps()[0] || initializeApp(firebaseConfig);
  }
  return app;
}

export function getDB(): Database {
  if (!database) {
    database = getDatabase(getFirebaseApp());
  }
  return database;
}

export function dbRef(): DatabaseReference {
  return ref(getDB(), DB_PATH);
}

export function subscribeDB(cb: (raw: unknown) => void): () => void {
  const r = dbRef();
  const unsub = onValue(
    r,
    (snap) => cb(snap.val()),
    (err) => {
      console.warn("Firebase subscribe error:", err);
      cb(null);
    }
  );
  return unsub;
}

const ID_COLLECTIONS = [
  "members",
  "sessions",
  "fixedSchedules",
  "fixedBlocks",
  "cancelHistory",
] as const;

const RECORD_FIELDS = [
  "att",
  "blocks",
  "blockReasons",
  "memos",
  "sessionMemos",
  "monthlyExtras",
] as const;

function arrToMap<T extends { id: string }>(arr: T[]): Record<string, T> {
  const m: Record<string, T> = {};
  for (const x of arr) m[x.id] = x;
  return m;
}

function diffArr<T extends { id: string }>(
  out: Record<string, unknown>,
  prefix: string,
  prev: T[],
  next: T[]
): void {
  const prevMap = new Map(prev.map((x) => [x.id, x]));
  const nextMap = new Map(next.map((x) => [x.id, x]));
  for (const id of prevMap.keys()) {
    if (!nextMap.has(id)) out[`${prefix}/${id}`] = null;
  }
  for (const [id, item] of nextMap) {
    const p = prevMap.get(id);
    if (!p || JSON.stringify(p) !== JSON.stringify(item)) {
      out[`${prefix}/${id}`] = item;
    }
  }
}

function diffRec<T>(
  out: Record<string, unknown>,
  prefix: string,
  prev: Record<string, T>,
  next: Record<string, T>
): void {
  for (const k of Object.keys(prev)) {
    if (!(k in next)) out[`${prefix}/${k}`] = null;
  }
  for (const [k, v] of Object.entries(next)) {
    if (prev[k] === undefined || JSON.stringify(prev[k]) !== JSON.stringify(v)) {
      out[`${prefix}/${k}`] = v;
    }
  }
}

export function writeDBDelta(prev: DB, next: DB): Promise<void> {
  let updates: Record<string, unknown>;
  try {
    const raw: Record<string, unknown> = {};
    diffArr(raw, "members", prev.members, next.members);
    diffArr(raw, "sessions", prev.sessions, next.sessions);
    diffArr(raw, "fixedSchedules", prev.fixedSchedules, next.fixedSchedules);
    diffArr(raw, "fixedBlocks", prev.fixedBlocks || [], next.fixedBlocks || []);
    diffArr(raw, "cancelHistory", prev.cancelHistory || [], next.cancelHistory || []);
    diffRec(raw, "att", prev.att || {}, next.att || {});
    diffRec(raw, "blocks", prev.blocks || {}, next.blocks || {});
    diffRec(raw, "blockReasons", prev.blockReasons || {}, next.blockReasons || {});
    diffRec(raw, "memos", prev.memos || {}, next.memos || {});
    diffRec(raw, "sessionMemos", prev.sessionMemos || {}, next.sessionMemos || {});
    diffRec(raw, "monthlyExtras", prev.monthlyExtras || {}, next.monthlyExtras || {});
    // strip undefined; Firebase rejects undefined values
    updates = JSON.parse(JSON.stringify(raw));
  } catch (err) {
    return Promise.reject(err);
  }
  if (Object.keys(updates).length === 0) return Promise.resolve();
  return update(dbRef(), updates);
}

export function remoteHasArrayShape(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const r = raw as Record<string, unknown>;
  for (const k of ID_COLLECTIONS) {
    if (Array.isArray(r[k])) return true;
  }
  return false;
}

export function writeFullAsMaps(db: DB): Promise<void> {
  let cleaned: Record<string, unknown>;
  try {
    const wire: Record<string, unknown> = {
      members: arrToMap(db.members),
      sessions: arrToMap(db.sessions),
      fixedSchedules: arrToMap(db.fixedSchedules),
      fixedBlocks: arrToMap(db.fixedBlocks || []),
      cancelHistory: arrToMap(db.cancelHistory || []),
    };
    for (const f of RECORD_FIELDS) {
      wire[f] = (db as unknown as Record<string, unknown>)[f] || {};
    }
    cleaned = JSON.parse(JSON.stringify(wire));
  } catch (err) {
    return Promise.reject(err);
  }
  return set(dbRef(), cleaned);
}

export function writeBackupSnapshot(data: DB): Promise<void> {
  try {
    const cleaned = JSON.parse(JSON.stringify(data)) as DB;
    const today = new Date().toISOString().slice(0, 10);
    const snapRef = ref(getDB(), `ptcenter_backups/${today}`);
    return set(snapRef, { at: new Date().toISOString(), data: cleaned }).catch((err) => {
      console.warn("Firebase backup error:", err);
    });
  } catch (err) {
    console.warn("Firebase backup sync error:", err);
    return Promise.resolve();
  }
}
