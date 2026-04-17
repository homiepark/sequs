"use client";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { HOURS, TRAINERS, type Session, type TrainerId } from "@/lib/types";
import { Modal } from "../ui/Modal";

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
  const [useCustomName, setUseCustomName] = useState(false);
  const [customName, setCustomName] = useState("");
  const [showAllMem, setShowAllMem] = useState(false);
  const [mid, setMid] = useState<string>(existing?.mid || "");
  const [isHalf, setIsHalf] = useState<boolean>(
    !!(existing && existing.time && existing.time.endsWith(":30"))
  );

  const [isFixed, setIsFixed] = useState(false);
  const [fixedStart, setFixedStart] = useState(date);
  const [fixedEnd, setFixedEnd] = useState("");
  const [noEnd, setNoEnd] = useState(false);

  const memList = useMemo(() => {
    const list = showAllMem ? db.members : db.members.filter((m) => m.tid === tid);
    return list.length ? list : db.members;
  }, [db.members, tid, showAllMem]);

  useEffect(() => {
    if (!useCustomName && memList.length && !memList.find((m) => m.id === mid)) {
      setMid(memList[0].id);
    }
  }, [memList, mid, useCustomName]);

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

  function save() {
    if (useCustomName && !customName.trim()) return alert("이름을 입력해주세요");
    const baseTime = time.replace(":30", ":00");
    const actualTime = isHalf ? baseTime.replace(":00", ":30") : baseTime;
    const cname = useCustomName ? customName.trim() : null;
    const memId = useCustomName ? null : mid;

    if (isFixed && !existing) {
      if (!noEnd && !fixedEnd) return alert("종료일을 선택해주세요");
      const sd = new Date(fixedStart + "T00:00:00");
      const dow = sd.getDay() === 0 ? 7 : sd.getDay();
      const fid = "f" + Date.now();
      mutate("고정수업 등록", (d) => {
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
        });
      });
    } else {
      mutate("수업 예약", (d) => {
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

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[0.71rem] text-mu font-medium">회원</label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomName}
              onChange={(e) => setUseCustomName(e.target.checked)}
              className="w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-[0.75rem] text-mu">직접 입력 (미등록)</span>
          </label>
        </div>
        {useCustomName ? (
          <input
            placeholder="이름 직접 입력"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
          />
        ) : (
          <>
            <select
              value={mid}
              onChange={(e) => setMid(e.target.value)}
              className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
            >
              {memList.map((m) => {
                const t = TRAINERS.find((x) => x.id === m.tid);
                return (
                  <option key={m.id} value={m.id}>
                    {showAllMem ? `${m.name} (${t?.name || "미배정"})` : m.name}
                  </option>
                );
              })}
            </select>
            <label className="flex items-center gap-1.5 mt-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={showAllMem}
                onChange={(e) => setShowAllMem(e.target.checked)}
                className="w-[15px] h-[15px] cursor-pointer"
              />
              <span className="text-[0.76rem] text-mu">전체 회원 보기</span>
            </label>
          </>
        )}
      </div>

      {!existing && (
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

      {/* Unused hour select kept for HOURS reference */}
      <datalist id="hour-list">
        {HOURS.map((h) => (
          <option key={h} value={h} />
        ))}
      </datalist>
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
