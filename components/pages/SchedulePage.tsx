"use client";
import { useMemo, useState } from "react";
import {
  DAYS_SHORT,
  HOURS,
  TRAINERS,
  fmtDateToISO,
  formatHourLabel,
  getSessionsForDate,
  getTrainer,
  isSlotBlocked,
  unblockSlot,
  weekDates,
  type Session,
  type TrainerId,
} from "@/lib/types";
import { useStore } from "@/lib/store";
import { TrainerTabs } from "../ui/TrainerTabs";
import { SessionCard } from "../schedule/SessionCard";
import { CancelChips } from "../schedule/CancelChips";
import { ActionMenu, type ActionContext } from "../schedule/ActionMenu";
import { SessionModal } from "../schedule/SessionModal";
import { BulkBlockModal } from "../schedule/BulkBlockModal";
import { MemoBar } from "../schedule/MemoBar";
import { SessionMemoModal } from "../schedule/SessionMemoModal";
import { FixedEndDateModal } from "../schedule/FixedEndDateModal";
import { WeekTabs } from "../schedule/WeekTabs";
import { MemberSearchModal } from "../members/MemberSearchModal";
import { useGridGestures } from "@/lib/useGridGestures";
import { useContainerWidth } from "@/lib/useContainerWidth";

const TODAY = new Date().toISOString().slice(0, 10);

type ViewMode = "single" | "dayAll" | "weekAll";

export function SchedulePage() {
  const { db } = useStore();
  const [weekOff, setWeekOff] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("dayAll");
  const [selTr, setSelTr] = useState<TrainerId>("t1");
  const todayDow = (() => {
    const d = new Date().getDay();
    return d === 0 ? 5 : Math.min(5, d - 1);
  })();
  const [dayIdx, setDayIdx] = useState<number>(todayDow);
  const [action, setAction] = useState<ActionContext | null>(null);
  const [modal, setModal] = useState<{
    date: string;
    time: string;
    tid: TrainerId;
    existing: Session | null;
  } | null>(null);
  const [blockModal, setBlockModal] = useState<{ date: string; time: string; tid: TrainerId } | null>(null);
  const [memoModal, setMemoModal] = useState<{
    date: string;
    time: string;
    tid: TrainerId;
    sess: Session | null;
  } | null>(null);
  const [endDateModal, setEndDateModal] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => weekDates(weekOff), [weekOff]);
  const { ref: gridRef, zoom } = useGridGestures();
  const weekLabel = `${days[0].getMonth() + 1}/${days[0].getDate()} — ${
    days[5].getMonth() + 1
  }/${days[5].getDate()}`;

  const allDay = fmtDateToISO(days[dayIdx] || days[0]);

  function jumpToWeek(newOff: number) {
    setWeekOff(newOff);
    setDayIdx(newOff === 0 ? todayDow : 0);
  }

  function chWeek(d: number) {
    jumpToWeek(weekOff + d);
  }

  function onYM(y: number, m: number) {
    const diff = Math.round((new Date(y, m - 1, 1).getTime() - Date.now()) / 86400000 / 7);
    jumpToWeek(diff);
  }

  return (
    <div>
      <div className="font-bebas text-[1.6rem] tracking-[2px] mb-3">
        주간 <em className="text-acc not-italic">스케줄</em>
      </div>

      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <select
          value={days[0].getFullYear()}
          onChange={(e) => onYM(parseInt(e.target.value), days[0].getMonth() + 1)}
          className="bg-sf2 border border-bd text-tx px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg text-[0.8rem] md:text-[0.95rem] outline-none"
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <select
          value={days[0].getMonth() + 1}
          onChange={(e) => onYM(days[0].getFullYear(), parseInt(e.target.value))}
          className="bg-sf2 border border-bd text-tx px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg text-[0.8rem] md:text-[0.95rem] outline-none"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}월</option>
          ))}
        </select>
        <button onClick={() => chWeek(-1)} className="bg-sf2 border border-bd text-tx px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg text-[0.8rem] md:text-[0.95rem] font-semibold hover:border-acc hover:text-acc">←</button>
        <span className="font-bold text-[0.84rem] md:text-[1rem] min-w-[80px] md:min-w-[110px] text-center">{weekLabel}</span>
        <button onClick={() => chWeek(1)} className="bg-sf2 border border-bd text-tx px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg text-[0.8rem] md:text-[0.95rem] font-semibold hover:border-acc hover:text-acc">→</button>
        <button onClick={() => jumpToWeek(0)} className="bg-sf2 border border-acc text-acc px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-[0.8rem] md:text-[0.95rem] font-semibold">오늘</button>
      </div>

      <WeekTabs
        weekOff={weekOff}
        year={days[0].getFullYear()}
        month={days[0].getMonth() + 1}
        onPick={(off) => jumpToWeek(off)}
      />

      <div className="flex gap-1.5 mb-3 flex-wrap items-center">
        <ModeBtn active={viewMode === "single"} onClick={() => setViewMode("single")}>📋 개별</ModeBtn>
        <ModeBtn active={viewMode === "dayAll"} onClick={() => setViewMode("dayAll")}>📅 하루 전체</ModeBtn>
        <ModeBtn active={viewMode === "weekAll"} onClick={() => setViewMode("weekAll")}>📊 주간 전체</ModeBtn>
        <button
          onClick={() => setSearchOpen(true)}
          title="회원 검색 — 스케줄에서 해당 회원 예약을 전부 표시"
          className="px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-[0.78rem] md:text-[0.95rem] font-bold border-[1.5px] whitespace-nowrap bg-sf2 text-tx border-bd hover:border-acc hover:text-acc"
        >
          🔍
        </button>
      </div>

      {viewMode === "single" && (
        <>
          <TrainerTabs
            hideAll
            value={selTr}
            onChange={(v) => {
              if (v !== "all") setSelTr(v as TrainerId);
            }}
          />
          <div ref={gridRef} style={{ touchAction: "pan-y" }}>
            <SingleTrainerView
              db={db}
              days={days}
              tid={selTr}
              zoom={zoom}
              onOpenAction={(ctx) => setAction(ctx)}
            />
          </div>
        </>
      )}

      {viewMode === "dayAll" && (
        <>
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto no-scrollbar">
            {days.map((d, i) => {
              const s = fmtDateToISO(d);
              const on = i === dayIdx;
              const isT = s === TODAY;
              const hasMemo = !!(db.memos || {})[s];
              return (
                <button
                  key={s}
                  onClick={() => setDayIdx(i)}
                  className={`relative px-3 py-1.5 md:px-5 md:py-3 rounded-lg border-[1.5px] text-[0.8rem] md:text-[1.05rem] font-bold whitespace-nowrap flex-shrink-0 ${
                    on
                      ? "bg-acc text-black border-acc"
                      : isT
                      ? "border-acc text-acc bg-transparent"
                      : "border-bd text-mu bg-transparent"
                  }`}
                >
                  {DAYS_SHORT[i]}
                  <span className="block text-[0.6rem] md:text-[0.82rem] opacity-70 mt-0.5">
                    {d.getMonth() + 1}/{d.getDate()}
                  </span>
                  {hasMemo && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-acc" />
                  )}
                </button>
              );
            })}
          </div>
          <MemoBar ds={allDay} />
          <div ref={gridRef} style={{ touchAction: "pan-y" }}>
            <AllTrainerDayView
              db={db}
              ds={allDay}
              zoom={zoom}
              onOpenAction={(ctx) => setAction(ctx)}
            />
          </div>
        </>
      )}

      {viewMode === "weekAll" && (
        <div ref={gridRef} style={{ touchAction: "pan-y" }}>
          <WeekAllView
            db={db}
            days={days}
            zoom={zoom}
            onOpenAction={(ctx) => setAction(ctx)}
          />
        </div>
      )}

      {action && (
        <ActionMenu
          ctx={action}
          onClose={() => setAction(null)}
          onBookOrEdit={(mode, existing) => {
            setModal({
              date: action.date,
              time: action.time,
              tid: action.tid,
              existing: mode === "edit" ? existing : null,
            });
            setAction(null);
          }}
          onBlock={() => {
            setBlockModal({ date: action.date, time: action.time, tid: action.tid });
            setAction(null);
          }}
          onMemo={() => {
            setMemoModal({
              date: action.date,
              time: action.time,
              tid: action.tid,
              sess: action.sess,
            });
            setAction(null);
          }}
          onSetEnd={(fixedId) => {
            setEndDateModal(fixedId);
            setAction(null);
          }}
        />
      )}

      {modal && (
        <SessionModal
          date={modal.date}
          time={modal.time}
          tid={modal.tid}
          existing={modal.existing}
          onClose={() => setModal(null)}
        />
      )}

      {blockModal && (
        <BulkBlockModal
          date={blockModal.date}
          time={blockModal.time}
          tid={blockModal.tid}
          onClose={() => setBlockModal(null)}
        />
      )}

      {memoModal && (
        <SessionMemoModal
          date={memoModal.date}
          time={memoModal.time}
          tid={memoModal.tid}
          sess={memoModal.sess}
          onClose={() => setMemoModal(null)}
        />
      )}

      {searchOpen && <MemberSearchModal onClose={() => setSearchOpen(false)} />}

      {endDateModal && (() => {
        const f = db.fixedSchedules.find((x) => x.id === endDateModal);
        if (!f) return null;
        const mem = f.mid ? db.members.find((m) => m.id === f.mid) : null;
        const name = f.customName || mem?.name || "?";
        return (
          <FixedEndDateModal
            fixedId={endDateModal}
            currentEnd={f.endDate || null}
            memberName={name}
            onClose={() => setEndDateModal(null)}
          />
        );
      })()}
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 md:px-4 md:py-2.5 rounded-lg text-[0.78rem] md:text-[0.95rem] font-bold border-[1.5px] whitespace-nowrap ${
        active ? "bg-acc text-black border-acc" : "bg-sf2 text-mu border-bd hover:border-acc hover:text-acc"
      }`}
    >
      {children}
    </button>
  );
}

import type { DB } from "@/lib/types";

function SingleTrainerView({
  db,
  days,
  tid,
  zoom,
  onOpenAction,
}: {
  db: DB;
  days: Date[];
  tid: TrainerId;
  zoom: number;
  onOpenAction: (ctx: ActionContext) => void;
}) {
  const rowMin = Math.round(56 * zoom);
  const { mutate } = useStore();
  const t = getTrainer(tid)!;
  const [wrapRef, containerW] = useContainerWidth<HTMLDivElement>();
  const stickyW = 52;
  const wideScreen = containerW > 800;
  const defaultDataW = wideScreen
    ? Math.floor((containerW - stickyW) / days.length)
    : 90;
  const colMin = Math.max(48, Math.round(defaultDataW * zoom));

  const dayCounts = days.map((d) => {
    const ds = fmtDateToISO(d);
    return getSessionsForDate(db, ds).filter((s) => {
      if (s.tid !== tid) return false;
      const st = db.att[`${ds}_${s.id}`];
      return st !== "precancel" && st !== "daycancel" && st !== "absent";
    }).length;
  });
  const weekTotal = dayCounts.reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="flex items-center gap-2 mb-2 flex-wrap px-0.5">
        <span
          className="px-2.5 py-1 rounded-lg font-black text-[0.82rem] md:text-[0.92rem] text-black"
          style={{ background: t.hex }}
        >
          {t.name} · 이번 주 {weekTotal}회
        </span>
        <div className="flex gap-1 flex-wrap text-[0.72rem] md:text-[0.82rem] text-mu">
          {days.map((d, i) => (
            <span
              key={fmtDateToISO(d)}
              className={`px-2 py-0.5 rounded bg-sf2 border border-bd ${
                dayCounts[i] > 0 ? "text-tx" : "text-mu"
              }`}
            >
              {DAYS_SHORT[i]} <span className="font-black text-acc">{dayCounts[i]}</span>
            </span>
          ))}
        </div>
      </div>
      <div ref={wrapRef} className="overflow-x-auto rounded-xl border border-bd w-full">
      <div
        className="grid bg-sf"
        style={{
          gridTemplateColumns: `${stickyW}px repeat(${days.length}, ${colMin}px)`,
        }}
      >
        <div className="bg-sf2 px-1.5 py-2 border-b-2 border-bd border-r border-r-bd flex items-center justify-center">
          <span className="text-[0.7rem] font-bold" style={{ color: t.hex }}>{t.name}</span>
        </div>
        {days.map((d, i) => {
          const ds = fmtDateToISO(d);
          const isToday = ds === TODAY;
          const isLast = i === days.length - 1;
          return (
            <div
              key={ds}
              className={`bg-sf2 px-1.5 py-2 text-center border-b-2 ${
                isToday ? "border-b-acc" : "border-b-bd"
              } ${isLast ? "" : "border-r border-r-bd"}`}
            >
              <div className={`text-[0.84rem] font-black ${isToday ? "text-acc" : ""}`}>{DAYS_SHORT[i]}</div>
              <div className="text-[0.64rem] text-mu mt-0.5 flex items-center justify-center gap-1">
                {d.getMonth() + 1}/{d.getDate()}
                <MemoBar ds={ds} compact />
              </div>
            </div>
          );
        })}

        {HOURS.map((h) => (
          <Fragment key={h}>
            <div
              className="flex items-center justify-center text-[0.95rem] md:text-[1.15rem] font-bold text-tx border-r border-r-bd border-b border-b-bd bg-sf sticky left-0 z-[1]"
              style={{ minHeight: rowMin }}
            >
              {formatHourLabel(h)}
            </div>
            {days.map((d, di) => {
              const ds = fmtDateToISO(d);
              const hHalf = h.replace(":00", ":30");
              const allSess = getSessionsForDate(db, ds);
              const sess =
                allSess.find((s) => s.time === h && s.tid === tid) ||
                allSess.find((s) => s.time === hHalf && s.tid === tid) ||
                null;
              const isB = isSlotBlocked(db, ds, tid, h);
              const isLast = di === days.length - 1;
              return (
                <Cell
                  key={ds + h}
                  db={db}
                  ds={ds}
                  time={h}
                  tid={tid}
                  sess={sess}
                  isB={isB}
                  extraCls={isLast ? "" : "border-r border-r-bd"}
                  rowMin={rowMin}
                  zoom={zoom}
                  onOpenAction={onOpenAction}
                  mutate={mutate}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
    </>
  );
}

import { Fragment } from "react";
import type { MutateFn } from "@/lib/store";

function Cell({
  db,
  ds,
  time,
  tid,
  sess,
  isB,
  extraCls,
  rowMin,
  zoom,
  onOpenAction,
  mutate,
}: {
  db: DB;
  ds: string;
  time: string;
  tid: TrainerId;
  sess: Session | null;
  isB: boolean;
  extraCls?: string;
  rowMin?: number;
  zoom: number;
  onOpenAction: (ctx: ActionContext) => void;
  mutate: MutateFn;
}) {
  return (
    <div
      className={`p-[3px] border-b border-b-bd cursor-pointer flex flex-col gap-0.5 ${
        isB ? "blocked-pattern cursor-default" : "hover:bg-white/[0.04]"
      } ${extraCls || ""}`}
      style={{ minHeight: rowMin || 56, background: isB ? undefined : "var(--sf)" }}
      onClick={(e) => {
        const tgt = e.target as HTMLElement;
        if (tgt.dataset.stop === "1") return;
        onOpenAction({ date: ds, time, tid, sess, isB, x: e.clientX, y: e.clientY });
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenAction({ date: ds, time, tid, sess, isB, x: e.clientX, y: e.clientY });
      }}
    >
      {isB ? (
        <BlockedCellContent
          db={db}
          ds={ds}
          time={time}
          tid={tid}
          onUnblock={() => {
            mutate("차단 해제", (d) => unblockSlot(d, ds, tid, time));
          }}
        />
      ) : sess ? (
        <SessionCard ds={ds} sess={sess} tid={tid} zoom={zoom} />
      ) : null}
      <CancelChips ds={ds} time={time} tid={tid} />
    </div>
  );
}

function AllTrainerDayView({
  db,
  ds,
  zoom,
  onOpenAction,
}: {
  db: DB;
  ds: string;
  zoom: number;
  onOpenAction: (ctx: ActionContext) => void;
}) {
  const rowMin = Math.round(56 * zoom);
  const { mutate } = useStore();
  const [wrapRef, containerW] = useContainerWidth<HTMLDivElement>();
  const stickyW = 56;
  const wideScreen = containerW > 800;
  const defaultDataW = wideScreen
    ? Math.floor((containerW - stickyW) / TRAINERS.length)
    : 110;
  const colW = Math.max(48, Math.round(defaultDataW * zoom));
  const d = new Date(ds + "T00:00:00");
  const label = ds === TODAY ? "오늘" : `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <div ref={wrapRef} className="overflow-x-auto overflow-y-auto rounded-xl border border-bd w-full block">
      <table
        className="border-collapse bg-sf"
        style={{ tableLayout: "fixed" }}
      >
        <colgroup>
          <col style={{ width: stickyW }} />
          {TRAINERS.map((t) => (
            <col key={t.id} style={{ width: colW }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-[5] bg-sf2 px-2 py-2.5 border-b-2 border-b-acc border-r border-r-bd font-bebas text-[0.95rem] text-acc text-center">
              {label}
            </th>
            {TRAINERS.map((t) => (
              <th
                key={t.id}
                className="sticky top-0 z-[3] bg-sf2 px-1.5 py-2.5 border-b-2 border-b-bd border-r border-r-bd text-[0.82rem] font-black text-center whitespace-nowrap"
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                  style={{ background: t.hex }}
                />
                {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h) => (
            <tr key={h}>
              <td
                className="sticky left-0 z-[2] bg-sf px-2 text-[0.95rem] md:text-[1.15rem] text-tx font-bold border-r border-r-bd border-b border-b-bd whitespace-nowrap text-center align-middle"
                style={{ height: rowMin }}
              >
                {formatHourLabel(h)}
              </td>
              {TRAINERS.map((t) => {
                const hHalf = h.replace(":00", ":30");
                const allSess = getSessionsForDate(db, ds);
                const sess =
                  allSess.find((s) => s.time === h && s.tid === t.id) ||
                  allSess.find((s) => s.time === hHalf && s.tid === t.id) ||
                  null;
                const isB = isSlotBlocked(db, ds, t.id, h);
                const cls = isB
                  ? "blocked-pattern cursor-default"
                  : sess
                  ? ""
                  : "bg-[rgba(35,209,96,0.04)] hover:bg-[rgba(35,209,96,0.09)]";
                return (
                  <td
                    key={t.id}
                    className={`p-[3px] border-r border-r-bd border-b border-b-bd align-top cursor-pointer hover:bg-white/[0.04] ${cls}`}
                    style={{ minHeight: rowMin, height: rowMin }}
                    onClick={(e) => {
                      const tgt = e.target as HTMLElement;
                      if (tgt.dataset.stop === "1") return;
                      onOpenAction({ date: ds, time: h, tid: t.id, sess, isB, x: e.clientX, y: e.clientY });
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onOpenAction({ date: ds, time: h, tid: t.id, sess, isB, x: e.clientX, y: e.clientY });
                    }}
                  >
                    <div className="flex flex-col w-full h-full gap-0.5">
                    {isB ? (
                      <BlockedCellContent
                        db={db}
                        ds={ds}
                        time={h}
                        tid={t.id}
                        onUnblock={() => {
                          mutate("차단 해제", (d) => unblockSlot(d, ds, t.id, h));
                        }}
                      />
                    ) : sess ? (
                      <SessionCard ds={ds} sess={sess} tid={t.id} zoom={zoom} />
                    ) : (
                      <div className="flex items-center justify-center h-12 text-[1.3rem] text-[rgba(35,209,96,0.2)]">+</div>
                    )}
                    <CancelChips ds={ds} time={h} tid={t.id} />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekAllView({
  db,
  days,
  zoom,
  onOpenAction,
}: {
  db: DB;
  days: Date[];
  zoom: number;
  onOpenAction: (ctx: ActionContext) => void;
}) {
  const rowMin = Math.round(40 * zoom);
  const [wrapRef, containerW] = useContainerWidth<HTMLDivElement>();
  const timeW = 56;
  const trainerW = 78;
  const stickyW = timeW + trainerW;
  const wideScreen = containerW > 800;
  const defaultDataW = wideScreen
    ? Math.floor((containerW - stickyW) / days.length)
    : 80;
  const colMin = Math.max(40, Math.round(defaultDataW * zoom));
  const { mutate } = useStore();

  const gridTemplateColumns = `${timeW}px ${trainerW}px repeat(${days.length}, ${colMin}px)`;

  return (
    <div ref={wrapRef} className="overflow-auto rounded-xl border border-bd w-full">
      <div
        className="bg-sf grid"
        style={{
          gridTemplateColumns,
          gridAutoRows: `minmax(${rowMin}px, max-content)`,
          width: "max-content",
        }}
      >
        {/* header row */}
        <div
          className="sticky top-0 left-0 z-[5] bg-sf2 flex items-center justify-center font-bebas text-[0.85rem] text-acc border-b-2 border-b-acc border-r border-r-bd"
          style={{ gridRow: 1, gridColumn: 1, height: rowMin }}
        >
          시간
        </div>
        <div
          className="sticky top-0 z-[5] bg-sf2 flex items-center justify-center text-[0.72rem] md:text-[0.85rem] text-tx font-bold border-b-2 border-b-acc border-r border-r-bd whitespace-nowrap"
          style={{ left: timeW, gridRow: 1, gridColumn: 2, height: rowMin }}
        >
          트레이너
        </div>
        {days.map((d, i) => {
          const ds = fmtDateToISO(d);
          const isT = ds === TODAY;
          return (
            <div
              key={ds}
              className="sticky top-0 z-[3] bg-sf2 flex flex-col items-center justify-center border-b-2 border-r border-r-bd whitespace-nowrap"
              style={{ borderBottomColor: isT ? "var(--acc)" : "var(--bd)", gridRow: 1, gridColumn: 3 + i, height: rowMin }}
            >
              <div className={`font-black text-[0.82rem] ${isT ? "text-acc" : "text-tx"}`}>{DAYS_SHORT[i]}</div>
              <div className="text-[0.64rem] text-mu mt-0.5 flex items-center justify-center gap-1">
                {d.getMonth() + 1}/{d.getDate()}
                <MemoBar ds={ds} compact />
              </div>
            </div>
          );
        })}

        {/* body rows */}
        {HOURS.map((h, hi) => {
          const baseRow = 2 + hi * TRAINERS.length;
          return (
            <Fragment key={h}>
              <div
                className="sticky left-0 z-[2] bg-sf flex items-center justify-center font-bold text-[0.95rem] md:text-[1.2rem] text-tx border-r border-r-bd border-b-2 border-b-[#4a4a68]"
                style={{ gridColumn: 1, gridRow: `${baseRow} / span ${TRAINERS.length}` }}
              >
                {formatHourLabel(h)}
              </div>
              {TRAINERS.map((t, ti) => {
                const isLast = ti === TRAINERS.length - 1;
                const rowIdx = baseRow + ti;
                const rowEndCls = isLast
                  ? "border-b-2 border-b-[#4a4a68]"
                  : "border-b border-b-bd";
                return (
                  <Fragment key={h + t.id}>
                    <div
                      className={`sticky z-[2] bg-sf flex items-center justify-center text-[0.72rem] md:text-[0.86rem] font-bold border-r border-r-bd whitespace-nowrap ${rowEndCls}`}
                      style={{ left: timeW, gridColumn: 2, gridRow: rowIdx, color: t.hex }}
                    >
                      {t.name}
                    </div>
                    {days.map((d, di) => {
                      const ds = fmtDateToISO(d);
                      const hHalf = h.replace(":00", ":30");
                      const allSess = getSessionsForDate(db, ds);
                      const sess =
                        allSess.find((s) => s.time === h && s.tid === t.id) ||
                        allSess.find((s) => s.time === hHalf && s.tid === t.id) ||
                        null;
                      const isB = isSlotBlocked(db, ds, t.id, h);
                      const cls = isB
                        ? "blocked-pattern cursor-default"
                        : sess
                        ? ""
                        : "bg-[rgba(35,209,96,0.04)] hover:bg-[rgba(35,209,96,0.09)]";
                      return (
                        <div
                          key={ds}
                          className={`relative p-[2px] border-r border-r-bd flex items-stretch cursor-pointer hover:bg-white/[0.04] ${rowEndCls} ${cls}`}
                          style={{ gridColumn: 3 + di, gridRow: rowIdx }}
                          onClick={(e) => {
                            const tgt = e.target as HTMLElement;
                            if (tgt.dataset.stop === "1") return;
                            onOpenAction({ date: ds, time: h, tid: t.id, sess, isB, x: e.clientX, y: e.clientY });
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onOpenAction({ date: ds, time: h, tid: t.id, sess, isB, x: e.clientX, y: e.clientY });
                          }}
                        >
                          <div className="flex flex-col w-full gap-0.5">
                            {isB ? (
                              <BlockedCellContent
                                db={db}
                                ds={ds}
                                time={h}
                                tid={t.id}
                                onUnblock={() => {
                                  mutate("차단 해제", (d) => unblockSlot(d, ds, t.id, h));
                                }}
                              />
                            ) : sess ? (
                              <SessionCard ds={ds} sess={sess} tid={t.id} zoom={zoom} compactOnMobile />
                            ) : null}
                            <CancelChips ds={ds} time={h} tid={t.id} />
                          </div>
                        </div>
                      );
                    })}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function BlockedCellContent({
  db,
  ds,
  time,
  tid,
  onUnblock,
}: {
  db: DB;
  ds: string;
  time: string;
  tid: TrainerId;
  onUnblock: () => void;
}) {
  const dow = new Date(ds + "T00:00:00").getDay();
  const dowA = dow === 0 ? 7 : dow;
  const fb = (db.fixedBlocks || []).find(
    (b) =>
      b.dayOfWeek === dowA &&
      (b.tid === "all" || b.tid === tid) &&
      b.times.includes(time) &&
      (!b.startDate || ds >= b.startDate) &&
      (!b.endDate || ds <= b.endDate)
  );
  const oneOffReason = (db.blockReasons || {})[`${ds}_${tid}_${time}`];

  if (fb) {
    const text = fb.label || "고정 차단";
    return (
      <div
        className="w-full h-full flex items-center justify-center text-[0.7rem] md:text-[0.82rem] font-bold px-1 text-center leading-tight"
        style={{ color: "#d4a800" }}
        title={fb.label ? `${fb.label} (고정 차단)` : "고정 차단 (셀을 눌러 메뉴에서 해제)"}
      >
        {text}
      </div>
    );
  }

  return (
    <button
      data-stop="1"
      onClick={(e) => {
        e.stopPropagation();
        if (!confirm("시간 차단을 해제할까요?")) return;
        onUnblock();
      }}
      className="w-full h-full flex items-center justify-center bg-transparent border-none text-[0.7rem] md:text-[0.8rem] font-bold px-1 text-center leading-tight"
      style={{ color: "#d4a800" }}
    >
      {oneOffReason || "차단 해제"}
    </button>
  );
}
