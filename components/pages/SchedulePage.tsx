"use client";
import { useEffect, useMemo, useState } from "react";
import {
  DAYS_SHORT,
  HOURS,
  TRAINERS,
  fmtDateToISO,
  getSessionsForDate,
  getTrainer,
  isSlotBlocked,
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

const TODAY = new Date().toISOString().slice(0, 10);

type ViewMode = "single" | "dayAll" | "weekAll";

export function SchedulePage() {
  const { db } = useStore();
  const [weekOff, setWeekOff] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("dayAll");
  const [selTr, setSelTr] = useState<TrainerId>("t1");
  const [allDay, setAllDay] = useState<string>(TODAY);
  const [action, setAction] = useState<ActionContext | null>(null);
  const [modal, setModal] = useState<{
    date: string;
    time: string;
    tid: TrainerId;
    existing: Session | null;
  } | null>(null);
  const [blockModal, setBlockModal] = useState<{ date: string; time: string; tid: TrainerId } | null>(null);

  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => weekDates(weekOff), [weekOff]);
  const weekLabel = `${days[0].getMonth() + 1}/${days[0].getDate()} — ${
    days[5].getMonth() + 1
  }/${days[5].getDate()}`;

  useEffect(() => {
    if (!days.find((d) => fmtDateToISO(d) === allDay)) {
      const today = days.find((d) => fmtDateToISO(d) === TODAY);
      setAllDay(today ? fmtDateToISO(today) : fmtDateToISO(days[0]));
    }
  }, [days, allDay]);

  function chWeek(d: number) {
    setWeekOff((w) => w + d);
  }

  function onYM(y: number, m: number) {
    const diff = Math.round((new Date(y, m - 1, 1).getTime() - Date.now()) / 86400000 / 7);
    setWeekOff(diff);
  }

  return (
    <div>
      <div className="font-bebas text-[1.6rem] tracking-[2px] mb-3">
        주간 <em className="text-acc not-italic">스케줄</em>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select
          value={days[0].getFullYear()}
          onChange={(e) => onYM(parseInt(e.target.value), days[0].getMonth() + 1)}
          className="bg-sf2 border border-bd text-tx px-2.5 py-1.5 rounded-lg text-[0.8rem] outline-none"
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <select
          value={days[0].getMonth() + 1}
          onChange={(e) => onYM(days[0].getFullYear(), parseInt(e.target.value))}
          className="bg-sf2 border border-bd text-tx px-2.5 py-1.5 rounded-lg text-[0.8rem] outline-none"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}월</option>
          ))}
        </select>
        <button onClick={() => chWeek(-1)} className="bg-sf2 border border-bd text-tx px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold hover:border-acc hover:text-acc">← 이전</button>
        <span className="font-bold text-[0.9rem] min-w-[95px] text-center">{weekLabel}</span>
        <button onClick={() => chWeek(1)} className="bg-sf2 border border-bd text-tx px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold hover:border-acc hover:text-acc">다음 →</button>
        <button onClick={() => setWeekOff(0)} className="bg-sf2 border border-acc text-acc px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold">오늘</button>
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        <ModeBtn active={viewMode === "single"} onClick={() => setViewMode("single")}>📋 개별</ModeBtn>
        <ModeBtn active={viewMode === "dayAll"} onClick={() => setViewMode("dayAll")}>📅 하루 전체</ModeBtn>
        <ModeBtn active={viewMode === "weekAll"} onClick={() => setViewMode("weekAll")}>📊 주간 전체</ModeBtn>
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
          <SingleTrainerView
            db={db}
            days={days}
            tid={selTr}
            onOpenAction={(ctx) => setAction(ctx)}
          />
        </>
      )}

      {viewMode === "dayAll" && (
        <>
          <div className="flex gap-1.5 mb-2.5 overflow-x-auto no-scrollbar">
            {days.map((d, i) => {
              const s = fmtDateToISO(d);
              const on = s === allDay;
              const isT = s === TODAY;
              const hasMemo = !!(db.memos || {})[s];
              return (
                <button
                  key={s}
                  onClick={() => setAllDay(s)}
                  className={`relative px-3 py-1.5 rounded-lg border-[1.5px] text-[0.8rem] font-bold whitespace-nowrap flex-shrink-0 ${
                    on
                      ? "bg-acc text-black border-acc"
                      : isT
                      ? "border-acc text-acc bg-transparent"
                      : "border-bd text-mu bg-transparent"
                  }`}
                >
                  {DAYS_SHORT[i]}
                  <span className="block text-[0.6rem] opacity-70">
                    {d.getMonth() + 1}/{d.getDate()}
                  </span>
                  {hasMemo && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-acc" />
                  )}
                </button>
              );
            })}
          </div>
          <MemoBar ds={allDay} />
          <AllTrainerDayView
            db={db}
            ds={allDay}
            onOpenAction={(ctx) => setAction(ctx)}
          />
        </>
      )}

      {viewMode === "weekAll" && (
        <WeekAllView
          db={db}
          days={days}
          onOpenAction={(ctx) => setAction(ctx)}
        />
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
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[0.78rem] font-bold border-[1.5px] whitespace-nowrap ${
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
  onOpenAction,
}: {
  db: DB;
  days: Date[];
  tid: TrainerId;
  onOpenAction: (ctx: ActionContext) => void;
}) {
  const { mutate } = useStore();
  const t = getTrainer(tid)!;
  return (
    <div className="overflow-x-auto rounded-xl border border-bd w-full">
      <div
        className="grid bg-sf"
        style={{
          gridTemplateColumns: `52px repeat(6, minmax(75px, 1fr))`,
          minWidth: 500,
          width: "max-content",
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
            <div className="flex items-start justify-end px-2 pt-2 text-[0.7rem] text-mu border-r border-r-bd border-b border-b-bd min-h-[56px] bg-sf sticky left-0 z-[1]">
              {h}
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
                  ds={ds}
                  time={h}
                  tid={tid}
                  sess={sess}
                  isB={isB}
                  extraCls={isLast ? "" : "border-r border-r-bd"}
                  onOpenAction={onOpenAction}
                  mutate={mutate}
                />
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

import { Fragment } from "react";
import type { MutateFn } from "@/lib/store";

function Cell({
  ds,
  time,
  tid,
  sess,
  isB,
  extraCls,
  onOpenAction,
  mutate,
}: {
  ds: string;
  time: string;
  tid: TrainerId;
  sess: Session | null;
  isB: boolean;
  extraCls?: string;
  onOpenAction: (ctx: ActionContext) => void;
  mutate: MutateFn;
}) {
  return (
    <div
      className={`min-h-[56px] p-[3px] border-b border-b-bd cursor-pointer overflow-hidden flex flex-col gap-0.5 ${
        isB ? "blocked-pattern cursor-default" : "hover:bg-white/[0.04]"
      } ${extraCls || ""}`}
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
        <button
          data-stop="1"
          onClick={(e) => {
            e.stopPropagation();
            mutate("차단 해제", (d) => {
              delete d.blocks[`${ds}_${tid}_${time}`];
            });
          }}
          className="w-full h-full flex items-center justify-center bg-transparent border-none text-[rgba(220,175,0,0.9)] text-[0.65rem] font-bold"
        >
          차단 해제
        </button>
      ) : sess ? (
        <SessionCard ds={ds} sess={sess} tid={tid} />
      ) : null}
      <CancelChips ds={ds} time={time} tid={tid} />
    </div>
  );
}

function AllTrainerDayView({
  db,
  ds,
  onOpenAction,
}: {
  db: DB;
  ds: string;
  onOpenAction: (ctx: ActionContext) => void;
}) {
  const { mutate } = useStore();
  const d = new Date(ds + "T00:00:00");
  const label = ds === TODAY ? "오늘" : `${d.getMonth() + 1}/${d.getDate()}`;

  return (
    <div className="overflow-x-auto overflow-y-auto rounded-xl border border-bd w-full block">
      <table className="border-collapse bg-sf" style={{ minWidth: 420, width: "max-content", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-[5] bg-sf2 px-2 py-2.5 border-b-2 border-b-acc border-r border-r-bd font-bebas text-[0.95rem] text-acc text-center" style={{ minWidth: 52 }}>
              {label}
            </th>
            {TRAINERS.map((t) => (
              <th
                key={t.id}
                className="sticky top-0 z-[3] bg-sf2 px-1.5 py-2.5 border-b-2 border-b-bd border-r border-r-bd text-[0.82rem] font-black text-center whitespace-nowrap"
                style={{ width: 110 }}
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
              <td className="sticky left-0 z-[2] bg-sf px-2 pt-2 text-[0.7rem] text-mu font-semibold border-r border-r-bd border-b border-b-bd min-h-[56px] whitespace-nowrap text-right align-top" style={{ minWidth: 52 }}>
                {h}
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
                    className={`min-h-[56px] p-[3px] border-r border-r-bd border-b border-b-bd align-top cursor-pointer hover:bg-white/[0.04] ${cls}`}
                    style={{ width: 110 }}
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
                    {isB ? (
                      <button
                        data-stop="1"
                        onClick={(e) => {
                          e.stopPropagation();
                          mutate("차단 해제", (d) => {
                            delete d.blocks[`${ds}_${t.id}_${h}`];
                          });
                        }}
                        className="w-full h-full flex items-center justify-center bg-transparent border-none text-[rgba(220,175,0,0.9)] text-[0.65rem] font-bold"
                      >
                        차단 해제
                      </button>
                    ) : sess ? (
                      <SessionCard ds={ds} sess={sess} tid={t.id} />
                    ) : (
                      <div className="flex items-center justify-center h-12 text-[1.3rem] text-[rgba(35,209,96,0.2)]">+</div>
                    )}
                    <CancelChips ds={ds} time={h} tid={t.id} />
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
  onOpenAction,
}: {
  db: DB;
  days: Date[];
  onOpenAction: (ctx: ActionContext) => void;
}) {
  const { mutate } = useStore();

  return (
    <div className="overflow-x-auto overflow-y-auto rounded-xl border border-bd w-full block">
      <table className="border-collapse bg-sf" style={{ width: "max-content", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-[5] bg-sf2 px-1 py-2 border-b-2 border-b-acc border-r border-r-bd font-bebas text-[0.85rem] text-acc text-center" style={{ minWidth: 56 }}>
              시간
            </th>
            <th className="sticky top-0 left-[56px] z-[5] bg-sf2 px-1 py-2 border-b-2 border-b-acc border-r border-r-bd text-[0.7rem] text-mu text-center font-bold" style={{ minWidth: 60 }}>
              트레이너
            </th>
            {days.map((d, i) => {
              const ds = fmtDateToISO(d);
              const isT = ds === TODAY;
              return (
                <th
                  key={ds}
                  className="sticky top-0 z-[3] bg-sf2 px-1.5 py-2 border-b-2 border-r border-r-bd text-[0.7rem] text-center whitespace-nowrap"
                  style={{ width: 90, borderBottomColor: isT ? "var(--acc)" : "var(--bd)" }}
                >
                  <div className={`font-black text-[0.8rem] ${isT ? "text-acc" : ""}`}>{DAYS_SHORT[i]}</div>
                  <div className="text-[0.6rem] text-mu mt-0.5 flex items-center justify-center gap-1">
                    {d.getMonth() + 1}/{d.getDate()}
                    <MemoBar ds={ds} compact />
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {HOURS.map((h) =>
            TRAINERS.map((t, ti) => (
              <tr key={h + t.id}>
                {ti === 0 && (
                  <td
                    className="sticky left-0 z-[2] bg-sf px-1 text-[0.7rem] text-mu font-semibold border-r border-r-bd border-b border-b-bd text-center align-middle font-bebas tracking-wider"
                    style={{ minWidth: 56 }}
                    rowSpan={TRAINERS.length}
                  >
                    {h}
                  </td>
                )}
                <td
                  className="sticky left-[56px] z-[2] bg-sf px-1 py-1 text-[0.68rem] font-bold border-r border-r-bd border-b border-b-bd whitespace-nowrap text-center"
                  style={{ minWidth: 60, color: t.hex }}
                >
                  {t.name}
                </td>
                {days.map((d) => {
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
                    <td
                      key={ds}
                      className={`p-[2px] border-r border-r-bd border-b border-b-bd align-top cursor-pointer hover:bg-white/[0.04] ${cls}`}
                      style={{ width: 90, minWidth: 90 }}
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
                      {isB ? (
                        <button
                          data-stop="1"
                          onClick={(e) => {
                            e.stopPropagation();
                            mutate("차단 해제", (d) => {
                              delete d.blocks[`${ds}_${t.id}_${h}`];
                            });
                          }}
                          className="w-full h-full flex items-center justify-center bg-transparent border-none text-[rgba(220,175,0,0.9)] text-[0.6rem] font-bold"
                        >
                          차단 해제
                        </button>
                      ) : sess ? (
                        <SessionCard ds={ds} sess={sess} tid={t.id} />
                      ) : null}
                      <CancelChips ds={ds} time={h} tid={t.id} />
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
