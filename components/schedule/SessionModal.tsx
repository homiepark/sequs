"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  TRAINERS,
  fmtDateToISO,
  fmtKo,
  getMember,
  getSessionsForDate,
  recentMemberMemoLog,
  type Session,
  type TrainerId,
} from "@/lib/types";
import { Modal } from "../ui/Modal";
import { MemberAutocomplete, type MemberSelection } from "./MemberAutocomplete";
import { FixedConflictModal, type Conflict } from "./FixedConflictModal";

export function SessionModal({
  date,
  time,
  tid: initTid,
  existing,
  onClose,
}: {
  date: string;
  time: string;
  tid: TrainerId;
  existing: Session | null;
  onClose: () => void;
}) {
  const { db, mutate } = useStore();
  const [tid, setTid] = useState<TrainerId>(initTid);
  const [sel, setSel] = useState<MemberSelection>({
    mid: existing?.mid || null,
    customName: existing?.customName || null,
  });
  const [isHalf, setIsHalf] = useState<boolean>(
    !!(existing && existing.time && existing.time.endsWith(":30"))
  );

  const [isFixed, setIsFixed] = useState(false);
  const [fixedStart, setFixedStart] = useState(date);
  const [fixedEnd, setFixedEnd] = useState("");
  const [noEnd, setNoEnd] = useState(false);
  const [isTentative, setIsTentative] = useState<boolean>(!!existing?.isTentative);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);

  const preview = useMemo(() => {
    if (!isFixed || !fixedStart) return "";
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const dow = dayNames[new Date(fixedStart + "T00:00:00").getDay()];
    const t = time;
    let msg = `매주 ${dow}요일 ${t}`;
    if (!noEnd && fixedEnd) {
      const sd = new Date(fixedStart + "T00:00:00");
      const ed = new Date(fixedEnd + "T00:00:00");
      const weeks = Math.round((ed.getTime() - sd.getTime()) / 604800000) + 1;
      msg += ` · ${fixedStart.slice(5).replace("-", "/")} ~ ${fixedEnd
        .slice(5)
        .replace("-", "/")} (약 ${weeks}주)`;
    } else if (noEnd) {
      msg += " · 종료일 없이 계속";
    }
    return "📌 " + msg;
  }, [isFixed, fixedStart, fixedEnd, noEnd, time]);

  function registerNew(name: string): string {
    const newId = "m" + Date.now();
    mutate("새 회원 등록", (d) => {
      d.members.push({
        id: newId,
        name,
        phone: "",
        tid,
        tids: [tid],
      });
    });
    return newId;
  }

  const baseTime = time.replace(":30", ":00");
  const actualTime = isHalf ? baseTime.replace(":00", ":30") : baseTime;
  const cname = sel.customName;
  const memId = sel.mid;

  function proceedFixedSave(overwriteExisting: boolean) {
    const sd = new Date(fixedStart + "T00:00:00");
    const dow = sd.getDay() === 0 ? 7 : sd.getDay();
    const fid = "f" + Date.now();
    mutate("고정수업 등록", (d) => {
      if (overwriteExisting) {
        const endISO = noEnd ? null : fixedEnd;
        // Remove real session overrides at this tid+actualTime within range
        d.sessions = d.sessions.filter((s) => {
          if (s.tid !== tid) return true;
          if (s.time !== actualTime) return true;
          if (s.date < fixedStart) return true;
          if (endISO && s.date > endISO) return true;
          const sdow = new Date(s.date + "T00:00:00").getDay();
          const sdowA = sdow === 0 ? 7 : sdow;
          if (sdowA !== dow) return true;
          return false;
        });
        // Also end existing fixedSchedules covering this weekday+time
        d.fixedSchedules = d.fixedSchedules.map((f) => {
          if (f.tid !== tid) return f;
          if (f.time !== actualTime) return f;
          if (f.dayOfWeek !== dow) return f;
          // Mark end the day before new fixed starts so historical stays
          const newEnd = prevDay(fixedStart);
          if (!f.startDate || newEnd >= f.startDate) {
            if (!f.endDate || newEnd < f.endDate) {
              return { ...f, endDate: newEnd };
            }
          }
          return f;
        });
      }
      d.fixedSchedules.push({
        id: fid,
        tid,
        mid: memId,
        customName: cname,
        dayOfWeek: dow,
        time: actualTime,
        startDate: fixedStart,
        endDate: noEnd ? null : fixedEnd,
      });
    });
    onClose();
  }

  function save() {
    if (!sel.mid && !sel.customName) {
      return alert("회원을 선택하거나 이름을 입력해주세요");
    }

    if (isFixed && !existing) {
      if (!noEnd && !fixedEnd) return alert("종료일을 선택해주세요");
      // Conflict detection
      const found = findConflicts({
        db,
        tid,
        time: actualTime,
        startISO: fixedStart,
        endISO: noEnd ? null : fixedEnd,
      });
      if (found.length > 0) {
        setConflicts(found);
        return;
      }
      proceedFixedSave(false);
      return;
    }

    if (existing && existing.isFixed) {
      mutate("이번만 수정", (d) => {
        const baseOrig = existing.time.replace(":30", ":00");
        d.sessions = d.sessions.filter(
          (s) =>
            !(
              s.date === date &&
              (s.time === baseOrig || s.time === baseOrig.replace(":00", ":30")) &&
              s.tid === tid
            )
        );
        d.sessions.push({
          id: "s" + Date.now(),
          date,
          time: actualTime,
          tid,
          mid: memId,
          customName: cname,
          isTentative: isTentative || undefined,
        });
        delete d.att[`${date}_${existing.id}`];
      });
    } else if (existing) {
      mutate("수업 수정", (d) => {
        d.sessions = d.sessions.filter((s) => s.id !== existing.id);
        d.sessions.push({
          id: "s" + Date.now(),
          date,
          time: actualTime,
          tid,
          mid: memId,
          customName: cname,
          isTentative: isTentative || undefined,
        });
      });
    } else {
      mutate(isTentative ? "가예약 등록" : "수업 예약", (d) => {
        d.sessions = d.sessions.filter(
          (s) => !(s.date === date && s.time === actualTime && s.tid === tid)
        );
        d.sessions.push({
          id: "s" + Date.now(),
          date,
          time: actualTime,
          tid,
          mid: memId,
          customName: cname,
          isTentative: isTentative || undefined,
        });
      });
    }
    onClose();
  }

  return (
    <Modal title={existing ? "수업 수정" : "수업 예약"} onClose={onClose}>
      <Field label="날짜 · 시간">
        <div className="flex items-center gap-2.5">
          <input
            readOnly
            value={`${date}  ${time}`}
            className="opacity-60 flex-1 bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
          />
          <label className="flex items-center gap-1.5 cursor-pointer bg-sf2 border border-bd rounded-lg px-2.5 py-2 flex-shrink-0">
            <input
              type="checkbox"
              checked={isHalf}
              onChange={(e) => setIsHalf(e.target.checked)}
              className="w-[15px] h-[15px] cursor-pointer"
            />
            <span className="text-[0.82rem] font-bold">30분 시작</span>
          </label>
        </div>
      </Field>

      <Field label="트레이너">
        <select
          value={tid}
          onChange={(e) => setTid(e.target.value as TrainerId)}
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
        >
          {TRAINERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="회원">
        <MemberAutocomplete
          db={db}
          tid={tid}
          initialMid={sel.mid}
          initialCustomName={sel.customName}
          onChange={setSel}
          onRegisterNew={registerNew}
        />
      </Field>

      {(() => {
        const mem = getMember(db, sel.mid);
        const profileMemo = mem?.memo?.trim();
        const logs = recentMemberMemoLog(mem, 3);
        if (!profileMemo && !logs.length) return null;
        return (
          <div className="mb-3 flex flex-col gap-1.5">
            {profileMemo && (
              <div className="px-2.5 py-2 rounded-lg bg-[rgba(232,255,71,0.08)] border border-acc/30">
                <div className="text-[0.66rem] text-mu font-semibold mb-0.5">💬 회원 프로필 메모</div>
                <div className="text-[0.8rem] text-tx whitespace-pre-wrap leading-snug">{profileMemo}</div>
              </div>
            )}
            {logs.length > 0 && (
              <div className="px-2.5 py-2 rounded-lg bg-sf2 border border-bd">
                <div className="text-[0.66rem] text-mu font-semibold mb-1">📋 최근 이슈 로그</div>
                <div className="flex flex-col gap-1">
                  {logs.map((e) => (
                    <div key={e.id} className="text-[0.78rem] text-tx leading-snug">
                      <span className="text-acc font-bold mr-1">{fmtKo(e.date)}</span>
                      <span className="whitespace-pre-wrap">{e.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {!isFixed && (
        <label className="flex items-center gap-2 mb-2 px-1 cursor-pointer">
          <input
            type="checkbox"
            checked={isTentative}
            onChange={(e) => setIsTentative(e.target.checked)}
            className="w-[15px] h-[15px] cursor-pointer"
          />
          <span className="text-[0.82rem]">
            가예약으로 등록
            <span className="text-[0.72rem] text-mu ml-1">(취소 시 기록 없이 삭제)</span>
          </span>
        </label>
      )}

      {!existing && !isTentative && (
        <div className="bg-sf2 rounded-[10px] p-3 mb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="sr-only"
              checked={isFixed}
              onChange={(e) => setIsFixed(e.target.checked)}
            />
            <div
              className={`w-10 h-6 rounded-full relative transition ${
                isFixed ? "bg-acc" : "bg-bd"
              }`}
            >
              <div
                className={`w-[18px] h-[18px] bg-white rounded-full absolute top-[3px] shadow transition-transform ${
                  isFixed ? "translate-x-[18px] left-[3px]" : "left-[3px]"
                }`}
              />
            </div>
            <span className="font-bold text-[0.88rem]">고정 수업으로 등록</span>
          </label>
          {isFixed && (
            <div className="mt-3">
              <Field label="시작일">
                <input
                  type="date"
                  value={fixedStart}
                  onChange={(e) => setFixedStart(e.target.value)}
                  className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
                />
              </Field>
              <Field label="종료일">
                <input
                  type="date"
                  value={fixedEnd}
                  disabled={noEnd}
                  onChange={(e) => setFixedEnd(e.target.value)}
                  className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem] disabled:opacity-40"
                />
                <label className="flex items-center gap-1.5 mt-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={noEnd}
                    onChange={(e) => setNoEnd(e.target.checked)}
                    className="w-[15px] h-[15px] cursor-pointer"
                  />
                  <span className="text-[0.76rem] text-mu">종료일 없음 (계속 반복)</span>
                </label>
              </Field>
              <div className="text-[0.74rem] text-acc mt-1 leading-relaxed px-2 py-1.5 bg-[rgba(232,255,71,0.06)] rounded-md">
                {preview}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3.5">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem] border-none"
        >
          취소
        </button>
        <button
          onClick={save}
          className="flex-1 py-2.5 rounded-lg bg-acc text-black font-bold text-[0.83rem] border-none"
        >
          저장
        </button>
      </div>

      {conflicts && (
        <FixedConflictModal
          db={db}
          tid={tid}
          conflicts={conflicts}
          onCancel={() => setConflicts(null)}
          onKeep={() => {
            setConflicts(null);
            proceedFixedSave(false);
          }}
          onOverwrite={() => {
            setConflicts(null);
            proceedFixedSave(true);
          }}
        />
      )}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-[0.71rem] text-mu mb-1 font-medium">{label}</label>
      {children}
    </div>
  );
}

function prevDay(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() - 1);
  return fmtDateToISO(d);
}

function findConflicts({
  db,
  tid,
  time,
  startISO,
  endISO,
}: {
  db: import("@/lib/types").DB;
  tid: TrainerId;
  time: string;
  startISO: string;
  endISO: string | null;
}): Conflict[] {
  const out: Conflict[] = [];
  const start = new Date(startISO + "T00:00:00");
  const dow = start.getDay() === 0 ? 7 : start.getDay();
  const end = endISO
    ? new Date(endISO + "T00:00:00")
    : new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  for (let x = new Date(start); x <= end; x.setDate(x.getDate() + 7)) {
    const ds = fmtDateToISO(x);
    const daySessions = getSessionsForDate(db, ds);
    for (const s of daySessions) {
      if (s.tid !== tid) continue;
      if (s.time !== time) continue;
      const xdow = x.getDay() === 0 ? 7 : x.getDay();
      if (xdow !== dow) continue;
      out.push({ date: ds, sess: s });
    }
  }
  return out;
}
