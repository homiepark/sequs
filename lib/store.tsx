"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { DB } from "./types";
import { emptyDB, normalizeDB } from "./types";
import { subscribeDB, writeBackupSnapshot, writeDB } from "./firebase";

const LS_KEY = "seqmv_db_v1";
const LS_BACKUP_DATE = "seqmv_last_backup_date";
const MAX_HISTORY = 50;

export type SyncState = "local" | "syncing" | "error";

interface StoreContext {
  db: DB;
  sync: SyncState;
  mutate: (label: string, updater: (draft: DB) => void) => void;
  undo: () => boolean;
  canUndo: boolean;
  lastAction: string | null;
  exportJSON: () => string;
  importJSON: (text: string) => boolean;
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
  const [lastAction, setLastAction] = useState<string | null>(null);
  const historyRef = useRef<{ label: string; db: DB }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const remoteApplyingRef = useRef(false);

  useEffect(() => {
    setDb(readLocal());
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = subscribeDB((remote) => {
        if (remote) {
          const normalized = normalizeDB(remote);
          remoteApplyingRef.current = true;
          setDb((prev) => {
            if (JSON.stringify(prev) === JSON.stringify(normalized)) return prev;
            return normalized;
          });
          setSync("syncing");
          writeLocal(normalized);
          setTimeout(() => (remoteApplyingRef.current = false), 0);
        }
      });
    } catch (e) {
      console.warn("Firebase init failed:", e);
      setSync("error");
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const today = new Date().toISOString().slice(0, 10);
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

  const mutate = useCallback((label: string, updater: (draft: DB) => void) => {
    setDb((prev) => {
      const snap = clone(prev);
      historyRef.current.push({ label, db: snap });
      if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
      setCanUndo(historyRef.current.length > 0);
      setLastAction(label);

      const next = clone(prev);
      updater(next);
      writeLocal(next);
      writeDB(next);
      return next;
    });
  }, []);

  const undo = useCallback((): boolean => {
    const entry = historyRef.current.pop();
    setCanUndo(historyRef.current.length > 0);
    if (!entry) return false;
    setLastAction(`↩️ 되돌림: ${entry.label}`);
    setDb(() => {
      writeLocal(entry.db);
      writeDB(entry.db);
      return entry.db;
    });
    return true;
  }, []);

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
    () => ({ db, sync, mutate, undo, canUndo, lastAction, exportJSON, importJSON }),
    [db, sync, mutate, undo, canUndo, lastAction, exportJSON, importJSON]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreContext {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}
