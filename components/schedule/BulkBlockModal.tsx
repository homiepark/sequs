"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  HOURS,
  TRAINERS,
  getMember,
  getSessionsForDate,
  type Session,
  type TrainerId,
} from "@/lib/types";
import { Modal } from "../ui/Modal";

interface Conflict {
  tid: TrainerId;
  time: string;
  sess: Session;
  memberName: string;
}

export function BulkBlockModal({
  date,
  time,
  tid,
  onClose,
}: {
  date: string;
  time: string;
  tid: TrainerId;
  onClose: () => void;
}) {
  const { db, mutate } = useStore();
  const [times, setTimes] = useState<string[]>([time]);
  const [allTrainers, setAllTrainers] = useState(false);
  const [fixed, setFixed] = useState(false);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  function toggleTime(h: string) {
    setTimes((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort()));
  }

  const conflicts = useMemo<Conflict[]>(() => {
    if (fixed) return [];
    const targets: TrainerId[] = allTrainers ? TRAINERS.map((t) => t.id) : [tid];
    const list: Conflict[] = [];
    const all = getSessionsForDate(db, date);
    for (const s of all) {
      // sessions at :30 render in the hour-row cell, so match by hour
      const sessHour = s.time.replace(":30", ":00");
      if (!times.includes(sessHour)) continue;
      if (!targets.includes(s.tid)) continue;
      const st = db.att[`${date}_${s.id}`];
      if (st === "precancel" || st === "daycancel") continue;
      const mem = getMember(db, s.mid);
      list.push({
        tid: s.tid,
        time: s.time,
        sess: s,
        memberName: s.customName || mem?.name || "?",
      });
    }
    return list;
  }, [db, date, times, tid, allTrainers, fixed]);

  function applyBlock(targets: TrainerId[], trimmedReason: string) {
    mutate("시간 차단", (d) => {
      d.blockReasons = d.blockReasons || {};
      for (const t of targets) {
        for (const h of times) {
          const key = `${date}_${t}_${h}`;
          d.blocks[key] = true;
          if (trimmedReason) d.blockReasons[key] = trimmedReason;
          else delete d.blockReasons[key];
        }
      }
    });
  }

  function cancelAndBlock() {
    const targets: TrainerId[] = allTrainers ? TRAINERS.map((t) => t.id) : [tid];
    const trimmedReason = reason.trim();
    const cancelledAt = new Date().toISOString().slice(0, 16);
    mutate("수업 캔슬 + 차단", (d) => {
      d.blockReasons = d.blockReasons || {};
      d.cancelHistory = d.cancelHistory || [];
      // mark all conflict sessions as precancel
      for (const c of conflicts) {
        const k = `${date}_${c.sess.id}`;
        d.att[k] = "precancel";
        d.cancelHistory.push({
          id: "ch" + Date.now() + "_" + c.sess.id,
          date,
          time: c.time,
          tid: c.tid,
          mid: c.sess.mid,
          memName: c.memberName,
          type: "precancel",
          cancelledAt,
        });
      }
      // block selected slots
      for (const t of targets) {
        for (const h of times) {
          const key = `${date}_${t}_${h}`;
          d.blocks[key] = true;
          if (trimmedReason) d.blockReasons[key] = trimmedReason;
          else delete d.blockReasons[key];
        }
      }
    });
    onClose();
  }

  function skipAndBlock() {
    const targets: TrainerId[] = allTrainers ? TRAINERS.map((t) => t.id) : [tid];
    const trimmedReason = reason.trim();
    // normalize conflict times to hour so they match selected hour slots
    const blockedSet = new Set(
      conflicts.map((c) => `${c.tid}_${c.time.replace(":30", ":00")}`)
    );
    mutate("시간 차단 (수업 자리는 건너뜀)", (d) => {
      d.blockReasons = d.blockReasons || {};
      for (const t of targets) {
        for (const h of times) {
          if (blockedSet.has(`${t}_${h}`)) continue;
          const key = `${date}_${t}_${h}`;
          d.blocks[key] = true;
          if (trimmedReason) d.blockReasons[key] = trimmedReason;
          else delete d.blockReasons[key];
        }
      }
    });
    onClose();
  }

  function save() {
    if (!times.length) return alert("시간을 하나 이상 선택해주세요");
    const targets: TrainerId[] = allTrainers ? TRAINERS.map((t) => t.id) : [tid];
    const trimmedReason = reason.trim();

    if (fixed) {
      const dow = new Date(date + "T00:00:00").getDay();
      const dowA = dow === 0 ? 7 : dow;
      mutate("고정 차단 추가", (d) => {
        (d.fixedBlocks = d.fixedBlocks || []).push({
          id: "fb" + Date.now(),
          tid: allTrainers ? "all" : tid,
          dayOfWeek: dowA,
          times,
          label: trimmedReason || undefined,
        });
      });
      onClose();
      return;
    }

    if (conflicts.length > 0) {
      setConfirming(true);
      return;
    }

    applyBlock(targets, trimmedReason);
    onClose();
  }

  return (
    <Modal title="시간 차단" onClose={onClose}>
      <div className="text-[0.8rem] text-mu mb-3">
        {date} · {allTrainers ? "전체 트레이너" : TRAINERS.find((t) => t.id === tid)?.name}
      </div>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">차단할 시간</label>
        <div className="grid grid-cols-4 gap-1.5">
          {HOURS.map((h) => {
            const on = times.includes(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => toggleTime(h)}
                className={`py-1.5 rounded-md border font-bebas text-[0.85rem] tracking-wider ${
                  on ? "bg-[#c9a800] text-black border-[#c9a800]" : "bg-sf2 text-mu border-bd"
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allTrainers}
          onChange={(e) => setAllTrainers(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-[0.82rem]">전체 트레이너 한 번에 차단</span>
      </label>

      <label className="flex items-center gap-2 mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={fixed}
          onChange={(e) => setFixed(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-[0.82rem]">
          매주 {weekdayLabel(date)} 반복 (고정 차단)
        </span>
      </label>

      <div className="mb-3 mt-2">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">
          차단 사유 <span className="opacity-70">(선택)</span>
        </label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="점심, 회의, 외부일정 등"
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem] outline-none focus:border-acc"
        />
      </div>

      {!fixed && conflicts.length > 0 && !confirming && (
        <div className="mb-3 px-2.5 py-2 rounded-lg bg-orange/10 border border-orange/40">
          <div className="text-[0.78rem] text-orange font-bold mb-1">
            ⚠️ 선택한 시간 중 {conflicts.length}건의 수업이 있어요
          </div>
          <div className="text-[0.72rem] text-mu leading-snug">
            차단 누르면 처리 방법을 물어볼게요.
          </div>
        </div>
      )}

      {!confirming ? (
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem]"
          >
            취소
          </button>
          <button
            onClick={save}
            className="flex-1 py-2.5 rounded-lg bg-acc text-black font-bold text-[0.83rem]"
          >
            차단
          </button>
        </div>
      ) : (
        <ConflictPanel
          conflicts={conflicts}
          onCancel={() => setConfirming(false)}
          onCancelAndBlock={cancelAndBlock}
          onSkipAndBlock={skipAndBlock}
        />
      )}
    </Modal>
  );
}

function ConflictPanel({
  conflicts,
  onCancel,
  onCancelAndBlock,
  onSkipAndBlock,
}: {
  conflicts: Conflict[];
  onCancel: () => void;
  onCancelAndBlock: () => void;
  onSkipAndBlock: () => void;
}) {
  return (
    <div className="mt-3 border-t border-bd pt-3">
      <div className="text-[0.82rem] font-bold text-orange mb-2">
        ⚠️ {conflicts.length}건의 수업 — 어떻게 처리할까요?
      </div>
      <div className="max-h-[28vh] overflow-y-auto overscroll-contain mb-3 flex flex-col gap-1 border border-bd rounded-lg p-2 bg-sf2">
        {conflicts.map((c, i) => {
          const tr = TRAINERS.find((t) => t.id === c.tid);
          return (
            <div key={i} className="flex items-center gap-2 text-[0.78rem] px-1 py-0.5">
              <span className="font-bebas text-mu w-12">{c.time}</span>
              <span className="font-bold flex-1" style={{ color: tr?.hex }}>
                {c.memberName}
              </span>
              <span className="text-[0.66rem] text-mu">{tr?.name}</span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onCancelAndBlock}
          className="w-full py-2.5 rounded-lg bg-orange text-white font-bold text-[0.85rem] border-none"
        >
          📵 모두 사전 캔슬하고 차단
        </button>
        <div className="text-[0.7rem] text-mu -mt-1 text-center">
          → 위 수업 전부 사캔 처리 + 캔슬 히스토리 기록 + 슬롯 차단
        </div>

        <button
          onClick={onSkipAndBlock}
          className="w-full py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.85rem] border border-bd"
        >
          ⏭ 수업 있는 시간은 건너뛰고 차단
        </button>
        <div className="text-[0.7rem] text-mu -mt-1 text-center">
          → 빈 슬롯만 차단됨, 수업은 그대로 유지
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2 rounded-lg bg-sf2 text-tx font-bold text-[0.82rem] border-none mt-1"
        >
          ← 돌아가기
        </button>
      </div>
    </div>
  );
}

function weekdayLabel(ds: string): string {
  const n = ["일", "월", "화", "수", "목", "금", "토"];
  return n[new Date(ds + "T00:00:00").getDay()] + "요일";
}
