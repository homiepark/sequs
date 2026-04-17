"use client";
import { useStore } from "@/lib/store";
import { getSessionsForDate, type TrainerId } from "@/lib/types";

export function CancelChips({ ds, time, tid }: { ds: string; time: string; tid: TrainerId }) {
  const { db, mutate } = useStore();
  const history = (db.cancelHistory || []).filter(
    (h) => h.date === ds && h.time === time && h.tid === tid
  );
  if (!history.length) return null;

  return (
    <div className="flex flex-col gap-[2px] px-0.5 py-[1px] mt-0.5">
      {history.map((h) => (
        <div
          key={h.id}
          title={`${h.cancelledAt} 캔슬`}
          className={`flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[0.6rem] font-black bg-black/35 w-full leading-[1.3] border-l-2 ${
            h.type === "precancel" ? "text-orange border-l-orange" : "text-red border-l-red"
          }`}
        >
          <span className="truncate">
            {h.memName} {h.type === "precancel" ? "사캔" : "당캔"}
          </span>
          <button
            data-stop="1"
            onClick={(e) => {
              e.stopPropagation();
              if (!confirm(`"${h.memName}" ${h.type === "precancel" ? "사전캔슬" : "당일캔슬"} 기록과 스케줄을 완전히 삭제할까요?`))
                return;
              mutate("캔슬 기록 삭제", (d) => {
                d.cancelHistory = (d.cancelHistory || []).filter((x) => x.id !== h.id);
                const sess = getSessionsForDate(d, ds).find(
                  (s) => s.time === time && s.tid === tid && s.mid === h.mid
                );
                if (sess) {
                  delete d.att[`${ds}_${sess.id}`];
                  if (sess.isFixed && sess.fixedId) {
                    const f = d.fixedSchedules.find((x) => x.id === sess.fixedId);
                    if (f) f.skippedDates = [...(f.skippedDates || []), ds];
                  } else {
                    d.sessions = d.sessions.filter((s) => s.id !== sess.id);
                  }
                }
              });
            }}
            className="ml-auto opacity-60 hover:opacity-100 text-[0.7rem] px-0.5 bg-transparent border-none text-current leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
