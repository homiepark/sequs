"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Modal } from "../ui/Modal";

export function MemoBar({ ds, compact }: { ds: string; compact?: boolean }) {
  const { db } = useStore();
  const [editing, setEditing] = useState(false);
  const memo = (db.memos || {})[ds] || "";

  if (compact) {
    return (
      <>
        <button
          type="button"
          data-stop="1"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          title={memo || "메모 추가"}
          className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] leading-none ${
            memo ? "bg-acc/30 text-acc" : "bg-transparent text-mu/60 hover:text-mu"
          }`}
        >
          📝
        </button>
        {editing && <MemoModal ds={ds} onClose={() => setEditing(false)} />}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg mb-3 border-[1.5px] text-[0.86rem] md:text-[0.95rem] ${
          memo
            ? "memo-neon bg-[rgba(232,255,71,0.08)] text-tx"
            : "bg-sf2 border-dashed border-bd text-mu hover:text-acc hover:border-acc"
        }`}
      >
        <span className="text-[1rem] md:text-[1.1rem] leading-none mt-0.5">📝</span>
        <span
          className={`flex-1 leading-snug whitespace-pre-wrap font-bold ${
            memo ? "memo-neon-text" : ""
          }`}
        >
          {memo || "이 날의 메모 추가..."}
        </span>
        {memo && <span className="text-[0.7rem] opacity-60 font-medium">수정</span>}
      </button>
      {editing && <MemoModal ds={ds} onClose={() => setEditing(false)} />}
    </>
  );
}

function MemoModal({ ds, onClose }: { ds: string; onClose: () => void }) {
  const { db, mutate } = useStore();
  const existing = (db.memos || {})[ds] || "";
  const [text, setText] = useState(existing);

  function save() {
    const trimmed = text.trim();
    mutate(trimmed ? "메모 저장" : "메모 삭제", (d) => {
      d.memos = d.memos || {};
      if (!trimmed) delete d.memos[ds];
      else d.memos[ds] = trimmed;
    });
    onClose();
  }

  function remove() {
    mutate("메모 삭제", (d) => {
      if (d.memos) delete d.memos[ds];
    });
    onClose();
  }

  return (
    <Modal title={`${ds} 메모`} onClose={onClose}>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="저녁 회식 · 18시 이후 수업 없음"
        rows={5}
        className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.88rem] outline-none focus:border-acc resize-none"
      />
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
