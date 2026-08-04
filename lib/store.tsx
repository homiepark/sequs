"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DB } from "./types";
import { emptyDB, fmtDateToISO, normalizeDB } from "./types";
import {
  remoteHasArrayShape,
  subscribeDB,
  writeBackupSnapshot,
  writeDBDelta,
  writeFullAsMaps,
} from "./firebase";

const LS_KEY = "seqmv_db_v1";
const LS_BACKUP_DATE = "seqmv_last_backup_date";
const MAX_HISTORY = 50;

export type SyncState = "local" | "syncing" | "error";

export type MutateFn = (label: string, updater: (draft: DB) => void) => void;

interface StoreContext {
  db: DB;
  sync: SyncState;
  syncError: string | null;
  mutate: MutateFn;
  undo: () => boolean;
  canUndo: boolean;
  lastAction: string | null;
  exportJSON: () => string;
  importJSON: (text: string) => boolean;
  retrySync: () => void;
}

const Ctx = createContext<StoreContext | null>(null);

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function readLocal(): DB {
  if (typeof window === "undefined") return emptyDB();
  try {
    const r = localStorage.getItem(LS_KEY);
    if (r) return normalizeDB(JSON.parse(r));
  } catch {}
  return emptyDB();
}

function writeLocal(db: DB) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {}
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB>(() => emptyDB());
  const [sync, setSync] = useState<SyncState>("local");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const historyRef = useRef<{ label: string; db: DB }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const writeFailedRef = useRef(false);
  const dbRef2 = useRef<DB>(db);
  const lastServerDbRef = useRef<DB>(emptyDB());
  const hasFirstRemoteRef = useRef(false);
  const migrationInFlightRef = useRef(false);

  useEffect(() => {
    dbRef2.current = db;
  }, [db]);

  useEffect(() => {
    setDb(readLocal());
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeDB((remote) => {
        if (remote == null) return;

        // One-time migration: server still has legacy array-shape collections.
        // Rewrite as id-keyed maps so subsequent writes can be path-level
        // (avoids whole-DB last-write-wins overwriting other clients).
        if (remoteHasArrayShape(remote) && !migrationInFlightRef.current) {
          migrationInFlightRef.current = true;
          const normalized = normalizeDB(remote);
          writeFullAsMaps(normalized)
            .then(() => {
              console.info("[sync] migrated to map shape");
            })
            .catch((err) => {
              migrationInFlightRef.current = false;
              console.warn("[sync] migration failed:", err);
            });
        }

        if (writeFailedRef.current) {
          console.warn("[sync] skipping remote update — pending write failure");
          return;
        }

        const normalized = normalizeDB(remote);
        lastServerDbRef.current = normalized;
        hasFirstRemoteRef.current = true;
        setDb((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(normalized)) return prev;
          return normalized;
        });
        writeLocal(normalized);
      });
    } catch (e) {
      console.warn("Firebase init failed:", e);
      setSync("error");
      setSyncError(String((e as Error)?.message || e));
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const fireWrite = useCallback((next: DB) => {
    // Block writes until we've received the server state at least once.
    // Otherwise we'd happily push our stale local-cached state on top of
    // newer changes another trainer made while this device was offline.
    if (!hasFirstRemoteRef.current) {
      console.warn("[sync] deferring write — initial sync not received yet");
      setSync("error");
      setSyncError("아직 동기화되지 않았어요. 잠시 후 다시 시도해주세요.");
      writeFailedRef.current = true;
      return;
    }
    const prev = lastServerDbRef.current;
    setSync("syncing");
    writeDBDelta(prev, next).then(
      () => {
        writeFailedRef.current = false;
        lastServerDbRef.current = next;
        setSync("local");
        setSyncError(null);
      },
      (err) => {
        writeFailedRef.current = true;
        setSync("error");
        const msg = String(
          (err as { message?: string; code?: string })?.code ||
            (err as Error)?.message ||
            err
        );
        setSyncError(msg);
        console.warn("[sync] writeDBDelta failed:", err);
      }
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = fmtDateToISO(new Date());
    let last: string | null = null;
    try {
      last = localStorage.getItem(LS_BACKUP_DATE);
    } catch {}
    if (last !== today) {
      try {
        writeBackupSnapshot(db)
          .then(() => {
            try {
              localStorage.setItem(LS_BACKUP_DATE, today);
            } catch {}
          })
          .catch(() => {});
      } catch {}
    }
  }, [db]);

  const mutate = useCallback(
    (label: string, updater: (draft: DB) => void) => {
      setDb((prev) => {
        const snap = clone(prev);
        historyRef.current.push({ label, db: snap });
        if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
        setCanUndo(historyRef.current.length > 0);
        setLastAction(label);

        const next = clone(prev);
        updater(next);
        writeLocal(next);
        fireWrite(next);
        return next;
      });
    },
    [fireWrite]
  );

  const undo = useCallback((): boolean => {
    const entry = historyRef.current.pop();
    setCanUndo(historyRef.current.length > 0);
    if (!entry) return false;
    setLastAction(`↩️ 되돌림: ${entry.label}`);
    setDb(() => {
      writeLocal(entry.db);
      fireWrite(entry.db);
      return entry.db;
    });
    return true;
  }, [fireWrite]);

  const retrySync = useCallback(() => {
    fireWrite(dbRef2.current);
  }, [fireWrite]);

  const exportJSON = useCallback(() => JSON.stringify(db, null, 2), [db]);

  const importJSON = useCallback(
    (text: string): boolean => {
      try {
        const parsed = normalizeDB(JSON.parse(text));
        mutate("데이터 가져오기", (d) => {
          Object.assign(d, parsed);
        });
        return true;
      } catch {
        return false;
      }
    },
    [mutate]
  );

  const value = useMemo<StoreContext>(
    () => ({ db, sync, syncError, mutate, undo, canUndo, lastAction, exportJSON, importJSON, retrySync }),
    [db, sync, syncError, mutate, undo, canUndo, lastAction, exportJSON, importJSON, retrySync]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}
