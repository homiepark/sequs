"use client";
import { useStore } from "@/lib/store";
import { getMember, getTrainer, type Session, type TrainerId } from "@/lib/types";

export function SessionCard({ ds, sess, tid }: { ds: string; sess: Session; tid: TrainerId }) {
  const { db, mutate } = useStore();
  const t = getTrainer(tid)!;
  const mem = getMember(db, sess.mid);
  const ak = `${ds}_${sess.id}`;
  const st = db.att[ak] || null;
  const isPreCan = st === "precancel";
  const isDayCan = st === "daycancel";
  const isAbsent = st === "absent";
  const displayName = sess.customName || (mem ? mem.name : "?");
  const isHalf = sess.time && sess.time.endsWith(":30");

  if (isPreCan || isDayCan) return null;

  const cardStyle = { background: t.hex };
  const cls = "relative flex flex-col justify-center rounded-[5px] px-1.5 py-1 min-h-[48px] cursor-pointer overflow-visible group";

  return (
    <div className={cls} style={cardStyle}>
      <div className="font-black text-[0.8rem] text-black whitespace-normal leading-tight" style={{ wordBreak: "keep-all" }}>
        {displayName}
        {isHalf && <span className="text-[0.58rem] font-black opacity-75 ml-1 align-middle">·30</span>}
      </div>
      <div className="text-[0.58rem] mt-0.5 flex items-center gap-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
        {sess.isFixed && (
          <span className="inline-block rounded px-1 text-[0.56rem] font-bold tracking-wider bg-black/20 text-black">고정</span>
        )}
        {isAbsent && (
          <span className="inline-block rounded px-1 text-[0.56rem] font-bold tracking-wider bg-red text-white">결석</span>
        )}
      </div>
      <button
        data-stop="1"
        onClick={(e) => {
          e.stopPropagation();
          if (sess.isFixed && sess.fixedId) {
            const choice = window.confirm(
              '이 수업만 삭제할까요?\n\n"확인" → 이번 날짜만 삭제 (고정일정 유지)\n"취소" → 아무 작업 안 함'
            );
            if (choice) {
              mutate("이번만 삭제", (d) => {
                const f = d.fixedSchedules.find((x) => x.id === sess.fixedId);
                if (f) f.skippedDates = [...(f.skippedDates || []), ds];
                delete d.att[`${ds}_${sess.id}`];
                d.cancelHistory = (d.cancelHistory || []).filter(
                  (h) => !(h.date === ds && h.time === sess.time && h.tid === sess.tid && h.mid === sess.mid)
                );
              });
            }
          } else {
            mutate("수업 삭제", (d) => {
              d.sessions = d.sessions.filter((s) => s.id !== sess.id);
            });
          }
        }}
        className="absolute top-0.5 right-0.5 w-[15px] h-[15px] bg-black/30 border-none text-black rounded-[3px] text-[9px] cursor-pointer hidden group-hover:flex items-center justify-center leading-none"
      >
        ✕
      </button>
    </div>
  );
}
