"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import {
  fmtKo,
  getMember,
  getTrainer,
  recentMemberMemoLog,
  sessionSlotKey,
  type Session,
  type TrainerId,
} from "@/lib/types";

export interface ActionContext {
  date: string;
  time: string;
  tid: TrainerId;
  sess: Session | null;
  isB: boolean;
  x: number;
  y: number;
}

type Action =
  | "book"
  | "block"
  | "edit"
  | "precan"
  | "daycan"
  | "restore"
  | "rebook"
  | "del"
  | "delOnce"
  | "setEnd"
  | "unblock"
  | "memo"
  | "confirm"
  | "cancelTent";

export function ActionMenu({
  ctx,
  onClose,
  onBookOrEdit,
  onBlock,
  onMemo,
  onSetEnd,
}: {
  ctx: ActionContext;
  onClose: () => void;
  onBookOrEdit: (mode: "book" | "edit", existing: Session | null) => void;
  onBlock: () => void;
  onMemo: () => void;
  onSetEnd: (fixedId: string) => void;
}) {
  const { db, mutate } = useStore();
  const isMobile = useIsMobile();
  const { date, time, tid, sess, isB } = ctx;
  const st = sess ? db.att[`${date}_${sess.id}`] || null : null;
  const isCan = st === "precancel" || st === "daycancel";
  const hasS = !!sess;

  function run(a: Action) {
    const bKey = `${date}_${tid}_${time}`;
    if (a === "book") {
      onBookOrEdit("book", null);
      return;
    }
    if (a === "rebook") {
      onBookOrEdit("book", null);
      return;
    }
    if (a === "edit" && sess) {
      onBookOrEdit("edit", sess);
      return;
    }
    if (a === "block") {
      onBlock();
      return;
    }
    if (a === "memo") {
      onMemo();
      return;
    }
    if (a === "setEnd" && sess?.fixedId) {
      onSetEnd(sess.fixedId);
      return;
    }
    if (a === "confirm" && sess) {
      mutate("가예약 확정", (d) => {
        const s = d.sessions.find((x) => x.id === sess.id);
        if (s) s.isTentative = false;
      });
    }
    if (a === "cancelTent" && sess) {
      if (!confirm("가예약을 취소할까요?\n\n기록 없이 바로 삭제됩니다.")) return onClose();
      mutate("가예약 취소", (d) => {
        d.sessions = d.sessions.filter((x) => x.id !== sess.id);
      });
    }
    if (a === "unblock") {
      if (!confirm("시간 차단을 해제할까요?")) return onClose();
      mutate("차단 해제", (d) => {
        delete d.blocks[bKey];
        if (d.blockReasons) delete d.blockReasons[bKey];
        // Also remove matching fixedBlock entry for this slot if any
        const dow = new Date(date + "T00:00:00").getDay();
        const dowA = dow === 0 ? 7 : dow;
        d.fixedBlocks = (d.fixedBlocks || []).map((fb) => {
          if (fb.dayOfWeek !== dowA) return fb;
          if (fb.tid !== "all" && fb.tid !== tid) return fb;
          return { ...fb, times: fb.times.filter((t) => t !== time) };
        }).filter((fb) => fb.times.length > 0);
      });
    }
    if (a === "precan" && sess) {
      const mem = getMember(db, sess.mid);
      mutate("사전 캔슬", (d) => {
        d.att[`${date}_${sess.id}`] = "precancel";
        (d.cancelHistory = d.cancelHistory || []).push({
          id: "ch" + Date.now(),
          date,
          time,
          tid,
          mid: sess.mid,
          memName: mem ? mem.name : sess.customName || "?",
          type: "precancel",
          cancelledAt: new Date().toISOString().slice(0, 16),
        });
      });
    }
    if (a === "daycan" && sess) {
      const mem = getMember(db, sess.mid);
      mutate("당일 캔슬", (d) => {
        d.att[`${date}_${sess.id}`] = "daycancel";
        (d.cancelHistory = d.cancelHistory || []).push({
          id: "ch" + Date.now(),
          date,
          time,
          tid,
          mid: sess.mid,
          memName: mem ? mem.name : sess.customName || "?",
          type: "daycancel",
          cancelledAt: new Date().toISOString().slice(0, 16),
        });
      });
    }
    if (a === "restore" && sess) {
      mutate("캔슬 취소", (d) => {
        delete d.att[`${date}_${sess.id}`];
        d.cancelHistory = (d.cancelHistory || []).filter(
          (h) => !(h.date === date && h.time === time && h.tid === tid && h.mid === sess.mid)
        );
      });
    }
    if (a === "del" && sess) {
      if (sess.isFixed) {
        if (
          !confirm(
            "⚠️ 고정일정 전체 삭제\n\n과거 수업 기록까지 통계에서 사라집니다!\n\n다음 주부터 안 오시는 경우엔 '종료일 지정'을 사용하세요 (과거 기록 유지).\n\n그래도 전체 삭제할까요?"
          )
        )
          return onClose();
        mutate("고정일정 전체 삭제", (d) => {
          d.fixedSchedules = d.fixedSchedules.filter((f) => f.id !== sess.fixedId);
        });
      } else {
        mutate("수업 삭제", (d) => {
          d.sessions = d.sessions.filter((s) => s.id !== sess.id);
        });
      }
    }
    if (a === "delOnce" && sess && sess.isFixed && sess.fixedId) {
      mutate("이번만 삭제", (d) => {
        const f = d.fixedSchedules.find((x) => x.id === sess.fixedId);
        if (f) {
          f.skippedDates = [...(f.skippedDates || []), date];
        }
        delete d.att[`${date}_${sess.id}`];
        d.cancelHistory = (d.cancelHistory || []).filter(
          (h) => !(h.date === date && h.time === time && h.tid === tid && h.mid === sess.mid)
        );
      });
    }
    onClose();
  }

  const isFixed = !!sess?.isFixed;
  const isTent = !!sess?.isTentative;
  const memoKeyTime = sess?.time || time;
  const hasMemo =
    !!(db.sessionMemos || {})[`${date}_${tid}_${memoKeyTime}`]?.trim() ||
    !!(db.sessionMemos || {})[`${date}_${tid}_${time}`]?.trim();
  const canBlock = !isB && (!hasS || isCan);
  const allItems: { a: Action; label: string; icon: string; cls?: string; show: boolean }[] = [
    { a: "book", label: "수업 예약", icon: "📅", show: !hasS && !isB },
    { a: "block", label: "시간 차단", icon: "🚫", cls: "text-[#c9a800]", show: canBlock },
    { a: "confirm", label: "가예약 → 확정", icon: "✅", cls: "text-green", show: hasS && isTent },
    { a: "edit", label: isTent ? "가예약 수정" : "이번만 수정", icon: "✏️", cls: "text-orange", show: hasS && !isCan },
    { a: "memo", label: hasMemo ? "메모 수정" : "메모 작성", icon: "📝", show: hasS },
    { a: "precan", label: "사전 캔슬", icon: "📵", cls: "text-orange", show: hasS && !isCan && !isTent },
    { a: "daycan", label: "당일 캔슬", icon: "❌", cls: "text-red", show: hasS && !isCan && !isTent },
    { a: "restore", label: "캔슬 취소", icon: "↩️", cls: "text-green", show: hasS && isCan },
    { a: "rebook", label: "이 자리 재예약", icon: "🔄", show: hasS && isCan },
    { a: "delOnce", label: "이번만 삭제", icon: "🗑", cls: "text-red", show: hasS && isFixed },
    { a: "setEnd", label: "종료일 지정 (이후 중단)", icon: "📅", cls: "text-orange", show: hasS && isFixed },
    { a: "cancelTent", label: "가예약 취소", icon: "🗑", cls: "text-red", show: hasS && isTent },
    { a: "del", label: isFixed ? "고정 전체 삭제" : "수업 삭제", icon: "🗑", cls: "text-red", show: hasS && !isTent },
    { a: "unblock", label: "차단 해제", icon: "✅", cls: "text-[#c9a800]", show: isB },
  ];
  const items = allItems.filter((i) => i.show);

  if (isMobile) {
    const t = getTrainer(tid);
    const mem = sess ? getMember(db, sess.mid) : null;
    const memberMemoText = mem?.memo?.trim();
    const sessKeyTime = sess?.time || time;
    const sessionMemoText = sess
      ? (db.sessionMemos || {})[sessionSlotKey(date, tid, sessKeyTime)]?.trim() ||
        (db.sessionMemos || {})[sessionSlotKey(date, tid, time)]?.trim()
      : undefined;
    const recentLogs = recentMemberMemoLog(mem, 3);
    const showMemoBlock = !!(memberMemoText || sessionMemoText || recentLogs.length);
    return (
      <>
        <div className="fixed inset-0 bg-black/55 z-[500]" onClick={onClose} />
        <div
          className="fixed bottom-0 left-0 right-0 z-[600] bg-sf rounded-t-[18px] border-t border-bd pt-3 anim-fade-up max-h-[85vh] overflow-y-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 36px)" }}
        >
          <div className="w-9 h-1 bg-bd rounded-sm mx-auto mb-3.5" />
          <div className="px-4 pb-3 border-b border-bd mb-1.5">
            <div className="font-bebas text-[1.35rem] tracking-wider" style={{ color: t?.hex || "var(--acc)" }}>{time}</div>
            <div className="font-bold text-[0.95rem] mt-0.5">
              {hasS ? mem?.name || sess?.customName || "?" : t?.name + " 트레이너"}
            </div>
            <div className="text-[0.75rem] text-mu mt-0.5">
              {date}{sess?.isFixed ? " · 고정일정" : ""}
            </div>
          </div>
          {showMemoBlock && (
            <div className="px-4 pb-3 border-b border-bd mb-1.5 flex flex-col gap-2">
              {memberMemoText && (
                <div className="text-left px-3 py-2 rounded-lg bg-[rgba(232,255,71,0.08)] border border-acc/30">
                  <div className="text-[0.68rem] text-mu font-semibold mb-1">💬 회원 프로필 메모</div>
                  <div className="text-[0.85rem] text-tx whitespace-pre-wrap leading-snug">{memberMemoText}</div>
                </div>
              )}
              {sessionMemoText && (
                <div className="text-left px-3 py-2 rounded-lg bg-[rgba(255,170,0,0.10)] border border-orange/40">
                  <div className="text-[0.68rem] text-orange font-semibold mb-1">📝 세션 메모</div>
                  <div className="text-[0.85rem] text-tx whitespace-pre-wrap leading-snug">{sessionMemoText}</div>
                </div>
              )}
              {recentLogs.length > 0 && (
                <div className="text-left px-3 py-2 rounded-lg bg-sf2 border border-bd">
                  <div className="text-[0.68rem] text-mu font-semibold mb-1">📋 최근 이슈 로그</div>
                  <div className="flex flex-col gap-1.5">
                    {recentLogs.map((e) => (
                      <div key={e.id} className="text-[0.82rem] text-tx leading-snug">
                        <span className="text-acc font-bold mr-1.5">{fmtKo(e.date)}</span>
                        <span className="whitespace-pre-wrap">{e.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {items.map((b) => (
            <button
              key={b.a}
              onClick={() => run(b.a)}
              className={`flex items-center gap-3 w-full py-3.5 px-4 bg-transparent border-none text-[0.92rem] font-semibold text-left cursor-pointer active:bg-sf2 ${b.cls || "text-tx"}`}
            >
              <span className="text-[1.1rem] w-6 text-center">{b.icon}</span>
              {b.label}
            </button>
          ))}
        </div>
      </>
    );
  }

  const x = Math.min(ctx.x, window.innerWidth - 220);
  const spaceBelow = window.innerHeight - ctx.y - 12;
  const spaceAbove = ctx.y - 12;
  const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
  const maxH = Math.max(140, openUp ? spaceAbove : spaceBelow);
  const y = openUp
    ? Math.max(8, ctx.y - maxH - 4)
    : Math.max(8, Math.min(ctx.y + 4, window.innerHeight - 140));
  const mem = sess ? getMember(db, sess.mid) : null;
  const memberMemoText = mem?.memo?.trim();
  const sessKeyTime = sess?.time || time;
  const sessionMemoText = sess
    ? (db.sessionMemos || {})[sessionSlotKey(date, tid, sessKeyTime)]?.trim() ||
      (db.sessionMemos || {})[sessionSlotKey(date, tid, time)]?.trim()
    : undefined;
  const recentLogs = recentMemberMemoLog(mem, 3);
  const showMemoBlock = !!(memberMemoText || sessionMemoText || recentLogs.length);

  return (
    <>
      <div className="fixed inset-0 z-[440]" onClick={onClose} />
      <div
        className="fixed z-[450] bg-sf border border-bd rounded-[11px] p-1.5 min-w-[180px] max-w-[280px] shadow-2xl anim-fade-up overflow-y-auto overscroll-contain"
        style={{ left: x, top: y, maxHeight: `${maxH}px` }}
      >
        {showMemoBlock && (
          <div className="flex flex-col gap-1 p-1.5 mb-1 border-b border-bd pb-2">
            {memberMemoText && (
              <div className="px-2 py-1.5 rounded bg-[rgba(232,255,71,0.08)] border border-acc/30 text-left">
                <div className="text-[0.64rem] text-mu font-semibold mb-0.5">💬 회원 메모</div>
                <div className="text-[0.78rem] text-tx whitespace-pre-wrap leading-snug">
                  {memberMemoText}
                </div>
              </div>
            )}
            {sessionMemoText && (
              <div className="px-2 py-1.5 rounded bg-[rgba(255,170,0,0.10)] border border-orange/40 text-left">
                <div className="text-[0.64rem] text-orange font-semibold mb-0.5">📝 세션 메모</div>
                <div className="text-[0.78rem] text-tx whitespace-pre-wrap leading-snug">
                  {sessionMemoText}
                </div>
              </div>
            )}
            {recentLogs.length > 0 && (
              <div className="px-2 py-1.5 rounded bg-sf2 border border-bd text-left">
                <div className="text-[0.64rem] text-mu font-semibold mb-0.5">📋 최근 이슈 로그</div>
                <div className="flex flex-col gap-1">
                  {recentLogs.map((e) => (
                    <div key={e.id} className="text-[0.75rem] text-tx leading-snug">
                      <span className="text-acc font-bold mr-1">{fmtKo(e.date)}</span>
                      <span className="whitespace-pre-wrap">{e.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {items.map((b) => (
          <button
            key={b.a}
            onClick={() => run(b.a)}
            className={`block w-full py-2 px-3 rounded-[7px] text-[0.82rem] cursor-pointer text-left bg-transparent border-none hover:bg-sf2 ${b.cls || "text-tx"}`}
          >
            {b.icon} {b.label}
          </button>
        ))}
      </div>
    </>
  );
}

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const check = () => setM(window.innerWidth <= 768 || "ontouchstart" in window);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return m;
}
