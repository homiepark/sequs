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
  const ck = st === "present" ? "✓" : st === "absent" ? "✗" : "";
  const displayName = sess.customName || (mem ? mem.name : "?");
  const isHalf = sess.time && sess.time.endsWith(":30");

  const cardStyle =
    !isPreCan && !isDayCan ? { background: t.hex } : undefined;

  const cls = `relative flex flex-col justify-center rounded-[5px] px-1.5 py-1 min-h-[48px] cursor-pointer overflow-visible ${
    isPreCan
      ? "bg-[rgba(255,170,0,0.18)] border-[1.5px] border-dashed border-orange"
      : isDayCan
      ? "bg-[rgba(255,71,87,0.14)] border-[1.5px] border-dashed border-red"
      : ""
  }`;
  const textColor = isPreCan ? "text-orange" : isDayCan ? "text-red" : "text-black";

  return (
    <div className={cls} style={cardStyle}>
      <div className={`font-black text-[0.8rem] ${textColor} whitespace-normal leading-tight`} style={{ wordBreak: "keep-all" }}>
        {displayName}
        {isHalf && <span className="text-[0.58rem] font-black opacity-75 ml-1 align-middle">·30</span>}
      </div>
      <div className="text-[0.58rem] mt-0.5" style={{ color: isPreCan || isDayCan ? undefined : "rgba(0,0,0,0.55)" }}>
        {sess.isFixed && (
          <span className="inline-block rounded px-1 text-[0.56rem] font-bold tracking-wider bg-black/20 text-black">고정</span>
        )}
        {isPreCan && (
          <span className="inline-block rounded px-1 text-[0.56rem] font-bold tracking-wider bg-orange/45 text-black ml-0.5">사전캔슬</span>
        )}
        {isDayCan && (
          <span className="inline-block rounded px-1 text-[0.56rem] font-bold tracking-wider bg-red/45 text-black ml-0.5">당일캔슬</span>
        )}
      </div>
      <button
        data-stop="1"
        onClick={(e) => {
          e.stopPropagation();
          if (sess.isFixed) {
            if (confirm('고정일정 전체를 삭제할까요?\n이번만 취소하려면 "사전 캔슬"을 사용하세요.')) {
              mutate("고정일정 삭제", (d) => {
                d.fixedSchedules = d.fixedSchedules.filter((f) => f.id !== sess.fixedId);
              });
            }
          } else {
            mutate("수업 삭제", (d) => {
              d.sessions = d.sessions.filter((s) => s.id !== sess.id);
            });
          }
        }}
        className="absolute top-0.5 right-0.5 w-[15px] h-[15px] bg-black/30 border-none text-black rounded-[3px] text-[8px] cursor-pointer hidden group-hover:flex items-center justify-center"
      >
        ✕
      </button>
      {ck && (
        <span className="absolute bottom-0.5 right-1 text-[0.65rem] font-black text-black">{ck}</span>
      )}
    </div>
  );
}
