"use client";
import { DAYS_FULL, TRAINERS, getMember } from "@/lib/types";
import { useStore } from "@/lib/store";

export function FixedPage() {
  const { db, mutate } = useStore();
  const hasAny = db.fixedSchedules.length > 0;

  return (
    <div>
      <div className="font-bebas text-[1.6rem] tracking-[2px] mb-3">
        고정 <em className="text-acc not-italic">일정</em>
      </div>
      <p className="text-[0.8rem] text-mu mb-3.5">
        예약 시 "고정 수업으로 등록" 체크로 추가할 수 있어요. 스케줄에서 그날만 개별 수정·캔슬 가능.
      </p>
      {!hasAny ? (
        <div className="text-center py-11 text-mu text-[0.86rem] bg-sf rounded-xl border border-dashed border-bd">
          고정 일정 없음
        </div>
      ) : (
        TRAINERS.map((t) => {
          const items = db.fixedSchedules
            .filter((f) => f.tid === t.id)
            .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time));
          return (
            <div key={t.id} className="bg-sf border border-bd rounded-xl p-4 mb-3.5">
              <h4 className="text-[0.78rem] font-bold tracking-widest mb-3 uppercase" style={{ color: t.hex }}>
                {t.name}
              </h4>
              {!items.length ? (
                <div className="text-mu text-[0.8rem]">없음</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((f) => {
                    const mem = getMember(db, f.mid);
                    return (
                      <div key={f.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-sf2 rounded-lg">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.hex }} />
                        <div className="flex-1">
                          <div className="font-bold text-[0.84rem]">
                            {f.customName || mem?.name || "?"}
                          </div>
                          <div className="text-[0.7rem] text-mu mt-0.5">
                            {DAYS_FULL[f.dayOfWeek - 1]} {f.time}
                            {f.startDate && (
                              <>
                                {" · "}
                                {f.startDate.slice(5).replace("-", "/")}~
                                {f.endDate ? f.endDate.slice(5).replace("-", "/") : "종료없음"}
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (!confirm("고정일정을 삭제할까요?")) return;
                            mutate("고정일정 삭제", (d) => {
                              d.fixedSchedules = d.fixedSchedules.filter((x) => x.id !== f.id);
                            });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-transparent text-red border border-red font-bold text-[0.78rem]"
                        >
                          삭제
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
