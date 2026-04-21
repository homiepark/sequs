"use client";
import { getMember, getTrainer, type DB, type Session, type TrainerId } from "@/lib/types";
import { Modal } from "../ui/Modal";

export interface Conflict {
  date: string;
  sess: Session;
}

export function FixedConflictModal({
  db,
  tid,
  conflicts,
  onCancel,
  onKeep,
  onOverwrite,
}: {
  db: DB;
  tid: TrainerId;
  conflicts: Conflict[];
  onCancel: () => void;
  onKeep: () => void;
  onOverwrite: () => void;
}) {
  const t = getTrainer(tid);
  return (
    <Modal title="⚠️ 기존 예약 충돌" wide onClose={onCancel}>
      <div className="text-[0.85rem] text-tx mb-3 leading-relaxed">
        이 시간대에 이미 잡힌 수업이 <span className="font-bold text-acc">{conflicts.length}건</span>
        있어요. 어떻게 처리할까요?
      </div>
      <div className="max-h-[40vh] overflow-y-auto overscroll-contain flex flex-col gap-1 mb-3 border border-bd rounded-lg p-2 bg-sf2">
        {conflicts.map(({ date, sess }) => {
          const mem = getMember(db, sess.mid);
          const name = sess.customName || mem?.name || "?";
          return (
            <div key={date + sess.id} className="flex items-center gap-2 px-2 py-1.5 text-[0.8rem]">
              <span className="text-mu w-16">{date.slice(5).replace("-", "/")}</span>
              <span className="font-bold flex-1" style={{ color: t?.hex }}>
                {name}
              </span>
              {sess.isFixed && (
                <span className="text-[0.66rem] px-1.5 py-0.5 rounded bg-black/20 text-mu">
                  고정
                </span>
              )}
              {sess.isTentative && (
                <span className="text-[0.66rem] px-1.5 py-0.5 rounded border" style={{ color: t?.hex, borderColor: t?.hex }}>
                  가예약
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onKeep}
          className="w-full py-2.5 rounded-lg bg-acc text-black font-bold text-[0.85rem] border-none"
        >
          ✅ 등록 (기존 수업 유지)
        </button>
        <div className="text-[0.7rem] text-mu -mt-1 mb-1 text-center">
          → 충돌 날짜는 기존 수업이 우선 표시됨
        </div>

        <button
          onClick={onOverwrite}
          className="w-full py-2.5 rounded-lg bg-red text-white font-bold text-[0.85rem] border-none"
        >
          🔥 기존 수업 삭제하고 덮어쓰기
        </button>
        <div className="text-[0.7rem] text-mu -mt-1 mb-1 text-center">
          → 위 목록의 수업들이 모두 지워집니다
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.85rem] border-none"
        >
          ❌ 취소
        </button>
      </div>
    </Modal>
  );
}
