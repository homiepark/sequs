import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getDatabase, Database, ref, onValue, set, DatabaseReference } from "firebase/database";
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

export function subscribeDB(cb: (data: DB | null) => void): () => void {
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

export function writeDB(data: DB): Promise<void> {
  return set(dbRef(), data).catch((err) => {
    console.warn("Firebase write error:", err);
  });
}

export function writeBackupSnapshot(data: DB): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const snapRef = ref(getDB(), `ptcenter_backups/${today}`);
  return set(snapRef, { at: new Date().toISOString(), data }).catch((err) => {
    console.warn("Firebase backup error:", err);
  });
}
