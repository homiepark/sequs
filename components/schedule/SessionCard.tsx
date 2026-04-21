"use client";
import { useStore } from "@/lib/store";
import { useHighlight } from "@/lib/highlight";
import {
  getMember,
  getTrainer,
  sessionSlotKey,
  type Session,
  type TrainerId,
} from "@/lib/types";

export function SessionCard({
  ds,
  sess,
  tid,
  zoom = 1,
  compactOnMobile = false,
}: {
  ds: string;
  sess: Session;
  tid: TrainerId;
  zoom?: number;
  compactOnMobile?: boolean;
}) {
  const { db, mutate } = useStore();
  const { highlightMid } = useHighlight();
  const t = getTrainer(tid)!;
  const mem = getMember(db, sess.mid);
  const ak = `${ds}_${sess.id}`;
  const st = db.att[ak] || null;
  const isPreCan = st === "precancel";
  const isDayCan = st === "daycancel";
  const isAbsent = st === "absent";
  const displayName = sess.customName || (mem ? mem.name : "?");
  const isHalf = sess.time && sess.time.endsWith(":30");
  const sessionMemo = (db.sessionMemos || {})[sessionSlotKey(ds, tid, sess.time)]?.trim();
  const memberMemo = mem?.memo?.trim();
  const memoIndicator = sessionMemo ? "📝" : memberMemo ? "💬" : null;
  const memoTip = [
    memberMemo ? `💬 ${memberMemo}` : null,
    sessionMemo ? `📝 ${sessionMemo}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (isPreCan || isDayCan) return null;

  const isTentative = !!sess.isTentative;
  const cardStyle = isTentative
    ? {
        background: t.hex + "55",
        border: `2px dashed ${t.hex}`,
      }
    : { background: t.hex };
  const isHighlighted = !!highlightMid && sess.mid === highlightMid;
  const cls =
    "relative flex flex-col items-center justify-center text-center rounded-[5px] px-1 py-0.5 w-full flex-1 cursor-pointer overflow-hidden group" +
    (isHighlighted ? " member-highlight" : "");
  const nameSize = Math.max(0.68, 0.8 * zoom);
  const subSize = Math.max(0.5, 0.58 * zoom);
  const tagSize = Math.max(0.48, 0.56 * zoom);

  const showSecondRow = isAbsent || memoIndicator;

  return (
    <div className={cls} style={cardStyle}>
      <div
        className={`font-black whitespace-normal leading-tight w-full flex items-center justify-center gap-1 flex-wrap ${
          isTentative ? "" : "text-black"
        }`}
        style={{
          wordBreak: "keep-all",
          fontSize: `${nameSize}rem`,
          color: isTentative ? t.hex : undefined,
        }}
      >
        {isTentative && (
          <span
            className="inline-block rounded px-1 font-bold tracking-wider leading-none"
            style={{
              fontSize: `${tagSize}rem`,
              background: t.hex,
              color: "#000",
            }}
          >
            가
          </span>
        )}
        {sess.isFixed && (
          <span
            className={`${
              compactOnMobile ? "hidden md:inline-block" : "inline-block"
            } rounded px-1 font-bold tracking-wider bg-black/25 leading-none ${
              isTentative ? "" : "text-black"
            }`}
            style={{
              fontSize: `${tagSize}rem`,
              color: isTentative ? t.hex : undefined,
            }}
          >
            고정
          </span>
        )}
        <span>
          {displayName}
          {isHalf && (
            <span className="font-black opacity-75 ml-1 align-middle" style={{ fontSize: `${subSize}rem` }}>
              ·30
            </span>
          )}
        </span>
      </div>
      {showSecondRow && (
        <div
          className="mt-0.5 flex items-center justify-center gap-0.5 w-full"
          style={{ color: "rgba(0,0,0,0.55)", fontSize: `${subSize}rem` }}
        >
          {isAbsent && (
            <span
              className="inline-block rounded px-1 font-bold tracking-wider bg-red text-white"
              style={{ fontSize: `${tagSize}rem` }}
            >
              결석
            </span>
          )}
          {memoIndicator && (
            <span
              title={memoTip}
              className="inline-flex items-center justify-center rounded px-1 font-bold bg-black/30 text-black"
              style={{ fontSize: `${Math.max(0.52, 0.6 * zoom)}rem` }}
            >
              {memoIndicator}
            </span>
          )}
        </div>
      )}
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
