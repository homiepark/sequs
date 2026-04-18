export type TrainerId = "t1" | "t2" | "t3" | "t4";

export interface Trainer {
  id: TrainerId;
  name: string;
  hex: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  tid: TrainerId;
  tids?: TrainerId[];
  memo?: string;
}

export function memberTrainers(m: Member): TrainerId[] {
  if (m.tids && m.tids.length) return m.tids;
  return m.tid ? [m.tid] : [];
}

export function memberHasTrainer(m: Member, tid: TrainerId): boolean {
  return memberTrainers(m).includes(tid);
}

export interface Session {
  id: string;
  date: string;
  time: string;
  tid: TrainerId;
  mid: string | null;
  customName?: string | null;
  isFixed?: boolean;
  fixedId?: string;
}

export interface FixedSchedule {
  id: string;
  tid: TrainerId;
  mid: string | null;
  customName?: string | null;
  dayOfWeek: number;
  time: string;
  startDate?: string | null;
  endDate?: string | null;
  skippedDates?: string[];
}

export interface FixedBlock {
  id: string;
  tid: TrainerId | "all";
  dayOfWeek: number;
  times: string[];
  label?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export type AttStatus = "present" | "absent" | "precancel" | "daycancel";

export interface CancelHistoryEntry {
  id: string;
  date: string;
  time: string;
  tid: TrainerId;
  mid: string | null;
  memName: string;
  type: "precancel" | "daycancel";
  cancelledAt: string;
}

export interface DB {
  members: Member[];
  sessions: Session[];
  fixedSchedules: FixedSchedule[];
  fixedBlocks?: FixedBlock[];
  att: Record<string, AttStatus>;
  blocks: Record<string, boolean>;
  cancelHistory: CancelHistoryEntry[];
  memos?: Record<string, string>;
  sessionMemos?: Record<string, string>;
  monthlyExtras?: Record<string, { volansCount?: number }>;
}

export interface SalaryConfig {
  sessionPrice: number;
  laborIncome: number;
  insurance: number;
  retirement: number;
  volansPrice: number;
  deductWithholding: boolean;
  withholdingRate?: number;
}

export const SALARY_CONFIGS: Partial<Record<TrainerId, SalaryConfig>> = {
  t2: {
    sessionPrice: 55000,
    laborIncome: 1204000,
    insurance: 61000,
    retirement: 120400,
    volansPrice: 18000,
    deductWithholding: false,
  },
  t3: {
    sessionPrice: 55000,
    laborIncome: 1204000,
    insurance: 61000,
    retirement: 120400,
    volansPrice: 18000,
    deductWithholding: true,
  },
  t4: {
    sessionPrice: 55000,
    laborIncome: 1204000,
    insurance: 87530,
    retirement: 120400,
    volansPrice: 18000,
    deductWithholding: true,
  },
};

export const SALARY_EXCLUDED: Partial<Record<TrainerId, string>> = {
  t1: "대표 (수업료 정산 제외)",
};

export function sessionSlotKey(ds: string, tid: TrainerId, time: string): string {
  return `${ds}_${tid}_${time}`;
}

export const TRAINERS: Trainer[] = [
  { id: "t1", name: "이성훈", hex: "#ff6b35" },
  { id: "t2", name: "최서윤", hex: "#3ecfff" },
  { id: "t3", name: "박빛나", hex: "#b07fff" },
  { id: "t4", name: "최상민", hex: "#ff4fad" },
];

export const DAYS_SHORT = ["월", "화", "수", "목", "금", "토"] as const;
export const DAYS_FULL = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일"] as const;
export const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

export function formatHourLabel(h: string): string {
  const hh = parseInt(h.slice(0, 2));
  const display = hh > 12 ? hh - 12 : hh;
  return `${display}시`;
}
export const AVATAR_COLORS = ["#e8ff47", "#ff6b35", "#3ecfff", "#ff4fad", "#23d160", "#ffd700", "#b07fff", "#f87171"];

export function emptyDB(): DB {
  return {
    members: [
      { id: "m1", name: "이아주현", phone: "", tid: "t1" },
      { id: "m2", name: "홍미경", phone: "", tid: "t2" },
      { id: "m3", name: "박현희", phone: "", tid: "t3" },
      { id: "m4", name: "한양원", phone: "", tid: "t4" },
      { id: "m5", name: "이원명", phone: "", tid: "t1" },
      { id: "m6", name: "김효경", phone: "", tid: "t2" },
    ],
    sessions: [],
    fixedSchedules: [],
    fixedBlocks: [],
    att: {},
    blocks: {},
    cancelHistory: [],
    memos: {},
    sessionMemos: {},
    monthlyExtras: {},
  };
}

export function normalizeDB(raw: unknown): DB {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const rawMembers = Array.isArray(r.members) ? (r.members as Member[]) : [];
  const members = rawMembers.map((m) => ({
    ...m,
    tids: m.tids && Array.isArray(m.tids) && m.tids.length ? m.tids : m.tid ? [m.tid] : [],
  }));
  return {
    members,
    sessions: Array.isArray(r.sessions) ? (r.sessions as Session[]) : [],
    fixedSchedules: Array.isArray(r.fixedSchedules) ? (r.fixedSchedules as FixedSchedule[]) : [],
    fixedBlocks: Array.isArray(r.fixedBlocks) ? (r.fixedBlocks as FixedBlock[]) : [],
    att: r.att && typeof r.att === "object" ? (r.att as Record<string, AttStatus>) : {},
    blocks: r.blocks && typeof r.blocks === "object" ? (r.blocks as Record<string, boolean>) : {},
    cancelHistory: Array.isArray(r.cancelHistory) ? (r.cancelHistory as CancelHistoryEntry[]) : [],
    memos: r.memos && typeof r.memos === "object" ? (r.memos as Record<string, string>) : {},
    sessionMemos:
      r.sessionMemos && typeof r.sessionMemos === "object"
        ? (r.sessionMemos as Record<string, string>)
        : {},
    monthlyExtras:
      r.monthlyExtras && typeof r.monthlyExtras === "object"
        ? (r.monthlyExtras as Record<string, { volansCount?: number }>)
        : {},
  };
}

export function isSlotBlocked(db: DB, ds: string, tid: TrainerId, time: string): boolean {
  if (db.blocks[`${ds}_${tid}_${time}`]) return true;
  if (!db.fixedBlocks || !db.fixedBlocks.length) return false;
  const dow = new Date(ds + "T00:00:00").getDay();
  const dowA = dow === 0 ? 7 : dow;
  return db.fixedBlocks.some((fb) => {
    if (fb.dayOfWeek !== dowA) return false;
    if (fb.startDate && ds < fb.startDate) return false;
    if (fb.endDate && ds > fb.endDate) return false;
    if (fb.tid !== "all" && fb.tid !== tid) return false;
    return fb.times.includes(time);
  });
}

export function getTrainer(id: string): Trainer | undefined {
  return TRAINERS.find((t) => t.id === id);
}

export function getMember(db: DB, id: string | null | undefined): Member | undefined {
  if (!id) return undefined;
  return db.members.find((m) => m.id === id);
}

export function getSessionsForDate(db: DB, ds: string): Session[] {
  const real = db.sessions.filter((s) => s.date === ds);
  const dow = new Date(ds + "T00:00:00").getDay();
  const dowA = dow === 0 ? 7 : dow;
  const overridden = new Set(real.map((s) => s.tid + "_" + s.time));
  const fixed: Session[] = (db.fixedSchedules || [])
    .filter((f) => {
      if (f.dayOfWeek !== dowA) return false;
      if (f.startDate && ds < f.startDate) return false;
      if (f.endDate && ds > f.endDate) return false;
      if (f.skippedDates && f.skippedDates.includes(ds)) return false;
      return true;
    })
    .map((f) => ({
      id: "fx_" + f.id + "_" + ds,
      date: ds,
      time: f.time,
      tid: f.tid,
      mid: f.mid,
      customName: f.customName,
      isFixed: true,
      fixedId: f.id,
    }))
    .filter((f) => !overridden.has(f.tid + "_" + f.time));
  return [...real, ...fixed];
}

export function getAttStatus(db: DB, sess: Session): AttStatus | "auto" {
  const k = `${sess.date}_${sess.id}`;
  const v = db.att[k];
  if (v) return v;
  return "auto";
}

export function isCountedAsPresent(db: DB, sess: Session): boolean {
  const v = getAttStatus(db, sess);
  return v === "present" || v === "auto";
}

export function fmtDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekDates(offset: number): Date[] {
  const n = new Date();
  const d = n.getDay();
  const m = new Date(n);
  m.setDate(n.getDate() - (d === 0 ? 6 : d - 1) + offset * 7);
  return Array.from({ length: 6 }, (_, i) => {
    const x = new Date(m);
    x.setDate(m.getDate() + i);
    return x;
  });
}

export function fmtKo(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  const dn = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dn[d.getDay()]})`;
}
