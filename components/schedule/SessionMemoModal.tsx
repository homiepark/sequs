"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  getMember,
  getTrainer,
  sessionSlotKey,
  type Session,
  type TrainerId,
} from "@/lib/types";
import { Modal } from "../ui/Modal";

export function SessionMemoModal({
  date,
  time,
  tid,
  sess,
  onClose,
}: {
  date: string;
  time: string;
  tid: TrainerId;
  sess: Session | null;
  onClose: () => void;
}) {
  const { db, mutate } = useStore();
  const keyTime = sess?.time || time;
  const key = sessionSlotKey(date, tid, keyTime);
  const legacyKey = sessionSlotKey(date, tid, time);
  const existing =
    (db.sessionMemos || {})[key] || (db.sessionMemos || {})[legacyKey] || "";
  const [text, setText] = useState(existing);

  const t = getTrainer(tid);
  const mem = sess?.mid ? getMember(db, sess.mid) : null;
  const memberName = mem?.name || sess?.customName || null;
  const memberMemo = mem?.memo?.trim();

  function save() {
    const trimmed = text.trim();
    mutate(trimmed ? "세션 메모 저장" : "세션 메모 삭제", (d) => {
      d.sessionMemos = d.sessionMemos || {};
      // clean legacy mis-keyed entry (hour-only key for :30 sessions)
      if (legacyKey !== key) delete d.sessionMemos[legacyKey];
      if (!trimmed) delete d.sessionMemos[key];
      else d.sessionMemos[key] = trimmed;
    });
    onClose();
  }

  function remove() {
    mutate("세션 메모 삭제", (d) => {
      if (d.sessionMemos) {
        delete d.sessionMemos[key];
        if (legacyKey !== key) delete d.sessionMemos[legacyKey];
      }
    });
    onClose();
  }

  return (
    <Modal title="세션 메모" onClose={onClose}>
      <div className="mb-3 px-3 py-2 bg-sf2 rounded-lg">
        <div className="font-bebas text-[1.1rem] tracking-wider" style={{ color: t?.hex }}>
          {time}
        </div>
        <div className="text-[0.85rem] font-bold mt-0.5">
          {memberName || "빈 슬롯"}
        </div>
        <div className="text-[0.7rem] text-mu mt-0.5">
          {date} · {t?.name}
        </div>
      </div>

      {memberMemo && (
        <div className="mb-3">
          <div className="text-[0.7rem] text-mu mb-1 font-medium flex items-center gap-1">
            💬 회원 프로필 메모
            <span className="text-[0.66rem] opacity-60">(회원 탭에서 편집)</span>
          </div>
          <div className="px-3 py-2 bg-[rgba(232,255,71,0.06)] border border-acc/30 rounded-lg text-[0.82rem] leading-relaxed whitespace-pre-wrap">
            {memberMemo}
          </div>
        </div>
      )}

      <div className="mb-1">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">
          📝 세션 메모 (이 수업만)
        </label>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="예: 이날 사정있으면 알려달라고 함 / 여행으로 다음주 불참 예정"
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.86rem] outline-none focus:border-acc resize-none"
        />
      </div>

      <div className="flex gap-2 mt-3">
        {existing && (
          <button onClick={remove} className="py-2.5 px-3 rounded-lg bg-transparent text-red border border-red font-bold text-[0.8rem]">
            삭제
          </button>
        )}
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem]">
          취소
        </button>
        <button onClick={save} className="flex-1 py-2.5 rounded-lg bg-acc text-black font-bold text-[0.83rem]">
          저장
        </button>
      </div>
    </Modal>
  );
}
