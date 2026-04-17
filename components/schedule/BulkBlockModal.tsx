"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { HOURS, TRAINERS, type TrainerId } from "@/lib/types";
import { Modal } from "../ui/Modal";

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
  const { mutate } = useStore();
  const [times, setTimes] = useState<string[]>([time]);
  const [allTrainers, setAllTrainers] = useState(false);
  const [fixed, setFixed] = useState(false);

  function toggleTime(h: string) {
    setTimes((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort()));
  }

  function save() {
    if (!times.length) return alert("시간을 하나 이상 선택해주세요");
    const targets: TrainerId[] = allTrainers ? TRAINERS.map((t) => t.id) : [tid];

    if (fixed) {
      const dow = new Date(date + "T00:00:00").getDay();
      const dowA = dow === 0 ? 7 : dow;
      mutate("고정 차단 추가", (d) => {
        (d.fixedBlocks = d.fixedBlocks || []).push({
          id: "fb" + Date.now(),
          tid: allTrainers ? "all" : tid,
          dayOfWeek: dowA,
          times,
        });
      });
    } else {
      mutate("시간 차단", (d) => {
        for (const t of targets) {
          for (const h of times) {
            d.blocks[`${date}_${t}_${h}`] = true;
          }
        }
      });
    }
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

      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem]">
          취소
        </button>
        <button onClick={save} className="flex-1 py-2.5 rounded-lg bg-acc text-black font-bold text-[0.83rem]">
          차단
        </button>
      </div>
    </Modal>
  );
}

function weekdayLabel(ds: string): string {
  const n = ["일", "월", "화", "수", "목", "금", "토"];
  return n[new Date(ds + "T00:00:00").getDay()] + "요일";
}
