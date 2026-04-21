"use client";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useHighlight } from "@/lib/highlight";
import {
  fmtDateToISO,
  getSessionsForDate,
  getTrainer,
  type Member,
  type Session,
} from "@/lib/types";
import { Modal } from "../ui/Modal";

interface Entry {
  date: string;
  sess: Session;
  status: string;
  color: string;
}

function weekdayShort(ds: string): string {
  const d = new Date(ds + "T00:00:00").getDay();
  return ["일", "월", "화", "수", "목", "금", "토"][d];
}

export function MemberScheduleModal({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  const { db } = useStore();
  const { setHighlightMid } = useHighlight();

  const { past, future } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const dates = new Set<string>();
    db.sessions.filter((s) => s.mid === member.id).forEach((s) => dates.add(s.date));
    db.fixedSchedules
      .filter((f) => f.mid === member.id)
      .forEach((f) => {
        const start = f.startDate || "2024-01-01";
        const end = f.endDate || addMonths(today, 3);
        const s = new Date(start + "T00:00:00");
        const e = new Date(end + "T00:00:00");
        for (let x = new Date(s); x <= e; x.setDate(x.getDate() + 1)) {
          const dow = x.getDay() === 0 ? 7 : x.getDay();
          if (dow !== f.dayOfWeek) continue;
          const ds = fmtDateToISO(x);
          if (f.skippedDates?.includes(ds)) continue;
          dates.add(ds);
        }
      });

    const all: Entry[] = [];
    for (const ds of Array.from(dates).sort()) {
      const sess = getSessionsForDate(db, ds).find((s) => s.mid === member.id);
      if (!sess) continue;
      const att = db.att[`${ds}_${sess.id}`];
      const { label, color } = describeStatus(att, ds <= today);
      all.push({ date: ds, sess, status: label, color });
    }
    return {
      past: all.filter((e) => e.date < today).slice(-12).reverse(),
      future: all.filter((e) => e.date >= today).slice(0, 20),
    };
  }, [db, member.id]);

  function showOnSchedule() {
    setHighlightMid(member.id);
    onClose();
  }

  return (
    <Modal title={`${member.name} 예약`} wide onClose={onClose}>
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={showOnSchedule}
          className="flex-1 py-2 rounded-lg bg-acc text-black font-bold text-[0.82rem] border-none"
        >
          🔍 스케줄에서 하이라이트
        </button>
      </div>

      <Section title={`다가오는 예약 (${future.length})`} empty="예정된 예약 없음">
        {future.map((e) => (
          <Row key={e.date + e.sess.id} entry={e} />
        ))}
      </Section>

      <Section title={`최근 예약 (${past.length})`} empty="기록 없음">
        {past.map((e) => (
          <Row key={e.date + e.sess.id} entry={e} />
        ))}
      </Section>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem]"
        >
          닫기
        </button>
      </div>
    </Modal>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasKids = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <div className="mb-3">
      <div className="text-[0.78rem] font-bold text-mu mb-1.5 tracking-wider">{title}</div>
      {hasKids ? (
        <div className="flex flex-col gap-1">{children}</div>
      ) : (
        <div className="text-center py-3 text-mu text-[0.78rem] bg-sf2 rounded-lg">{empty}</div>
      )}
    </div>
  );
}

function Row({ entry }: { entry: Entry }) {
  const { date, sess, status, color } = entry;
  const t = getTrainer(sess.tid);
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-sf2 rounded-lg">
      <div className="flex flex-col items-center w-14">
        <div className="text-[0.72rem] text-mu">{date.slice(5).replace("-", "/")}</div>
        <div className="text-[0.74rem] font-bold" style={{ color: t?.hex }}>
          {weekdayShort(date)}
        </div>
      </div>
      <div className="flex-1">
        <div className="font-bebas text-[1rem] tracking-wider" style={{ color: t?.hex }}>
          {sess.time}
          {sess.isFixed && (
            <span className="inline-block ml-1.5 px-1.5 py-0.5 rounded text-[0.62rem] font-bold bg-black/20 text-mu">
              고정
            </span>
          )}
          {sess.isTentative && (
            <span className="inline-block ml-1.5 px-1.5 py-0.5 rounded text-[0.62rem] font-bold border" style={{ color: t?.hex, borderColor: t?.hex }}>
              가예약
            </span>
          )}
        </div>
        <div className="text-[0.72rem] text-mu">{t?.name}</div>
      </div>
      <div className="text-[0.74rem] font-bold" style={{ color }}>
        {status}
      </div>
    </div>
  );
}

function describeStatus(att: string | undefined, isPastOrToday: boolean): { label: string; color: string } {
  if (att === "precancel") return { label: "사전캔슬", color: "var(--orange)" };
  if (att === "daycancel") return { label: "당일캔슬", color: "var(--red)" };
  if (att === "absent") return { label: "결석", color: "var(--red)" };
  if (att === "present") return { label: "출석", color: "var(--green)" };
  return isPastOrToday
    ? { label: "자동 출석", color: "var(--mu)" }
    : { label: "예정", color: "var(--tx)" };
}

function addMonths(ds: string, months: number): string {
  const d = new Date(ds + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
