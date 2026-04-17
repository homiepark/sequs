"use client";
import { useStore } from "@/lib/store";
import type { TrainerId } from "@/lib/types";

export function CancelChips({ ds, time, tid }: { ds: string; time: string; tid: TrainerId }) {
  const { db, mutate } = useStore();
  const history = (db.cancelHistory || []).filter(
    (h) => h.date === ds && h.time === time && h.tid === tid
  );
  if (!history.length) return null;

  return (
    <div className="flex flex-col gap-[1px] px-0.5 py-[1px] mt-0.5">
      {history.map((h) => (
        <button
          key={h.id}
          title={`${h.cancelledAt} 캔슬`}
          data-stop="1"
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[0.6rem] font-black bg-black/35 w-full text-left leading-[1.3] border-none cursor-default border-l-2 ${
            h.type === "precancel" ? "text-orange border-l-orange" : "text-red border-l-red"
          }`}
        >
          <span>
            {h.memName} {h.type === "precancel" ? "사캔" : "당캔"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              mutate("캔슬 기록 삭제", (d) => {
                d.cancelHistory = (d.cancelHistory || []).filter((x) => x.id !== h.id);
              });
            }}
            className="ml-auto opacity-50 hover:opacity-100 text-[0.62rem] px-0.5 bg-transparent border-none text-current"
          >
            ✕
          </button>
        </button>
      ))}
    </div>
  );
}
