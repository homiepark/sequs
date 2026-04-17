"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Modal } from "../ui/Modal";

export function FixedEndDateModal({
  fixedId,
  currentEnd,
  memberName,
  onClose,
}: {
  fixedId: string;
  currentEnd: string | null;
  memberName: string;
  onClose: () => void;
}) {
  const { mutate } = useStore();
  const today = new Date();
  const lastSat = new Date(today);
  lastSat.setDate(today.getDate() - ((today.getDay() + 1) % 7) - 1);
  const defaultEnd = currentEnd || lastSat.toISOString().slice(0, 10);
  const [date, setDate] = useState(defaultEnd);

  function save() {
    if (!date) return alert("종료일을 선택해주세요");
    mutate("고정일정 종료일 설정", (d) => {
      const f = d.fixedSchedules.find((x) => x.id === fixedId);
      if (f) f.endDate = date;
    });
    onClose();
  }

  function removeEnd() {
    mutate("고정일정 종료일 해제", (d) => {
      const f = d.fixedSchedules.find((x) => x.id === fixedId);
      if (f) f.endDate = null;
    });
    onClose();
  }

  return (
    <Modal title="고정일정 종료일" onClose={onClose}>
      <div className="mb-3 px-3 py-2 bg-sf2 rounded-lg">
        <div className="text-[0.72rem] text-mu">회원</div>
        <div className="font-bold text-[0.95rem] mt-0.5">{memberName}</div>
      </div>

      <div className="mb-3">
        <label className="block text-[0.72rem] text-mu mb-1 font-medium">종료일</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.88rem]"
        />
        <div className="text-[0.74rem] text-mu mt-2 leading-relaxed">
          ✅ 이 날짜 이후의 수업은 자동으로 사라지고<br />
          이전 수업 기록은 <span className="text-acc font-bold">그대로 유지</span>됩니다.
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {currentEnd && (
          <button
            onClick={removeEnd}
            className="py-2.5 px-3 rounded-lg bg-transparent text-mu border border-bd font-bold text-[0.78rem]"
          >
            종료일 해제
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
