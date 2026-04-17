"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  fmtKo,
  getMember,
  getSessionsForDate,
  getTrainer,
  type AttStatus,
} from "@/lib/types";
import { TrainerTabs } from "../ui/TrainerTabs";

const TODAY = new Date().toISOString().slice(0, 10);

export function AttendancePage() {
  const { db, mutate } = useStore();
  const [date, setDate] = useState(TODAY);
  const [trF, setTrF] = useState("all");

  function chDate(delta: number) {
    const x = new Date(date + "T00:00:00");
    x.setDate(x.getDate() + delta);
    setDate(x.toISOString().slice(0, 10));
  }

  let sess = getSessionsForDate(db, date).sort((a, b) => a.time.localeCompare(b.time));
  if (trF !== "all") sess = sess.filter((s) => s.tid === trF);

  function mark(sid: string, status: AttStatus) {
    const key = `${date}_${sid}`;
    const current = db.att[key];
    if (current === status) {
      mutate("출석 취소", (d) => {
        if (current === "precancel" || current === "daycancel") {
          const s = getSessionsForDate(d, date).find((x) => x.id === sid);
          if (s) {
            d.cancelHistory = (d.cancelHistory || []).filter(
              (h) => !(h.date === date && h.time === s.time && h.tid === s.tid && h.mid === s.mid)
            );
          }
        }
        delete d.att[key];
      });
    } else {
      mutate(
        status === "present"
          ? "출석"
          : status === "absent"
          ? "결석"
          : status === "precancel"
          ? "사전캔슬"
          : "당일캔슬",
        (d) => {
          d.att[key] = status;
          if (status === "precancel" || status === "daycancel") {
            const s = getSessionsForDate(d, date).find((x) => x.id === sid);
            if (s) {
              const mem = getMember(d, s.mid);
              (d.cancelHistory = d.cancelHistory || []).push({
                id: "ch" + Date.now(),
                date,
                time: s.time,
                tid: s.tid,
                mid: s.mid,
                memName: mem ? mem.name : s.customName || "?",
                type: status,
                cancelledAt: new Date().toISOString().slice(0, 16),
              });
            }
          }
        }
      );
    }
  }

  return (
    <div>
      <div className="font-bebas text-[1.6rem] tracking-[2px] mb-3">
        출석 <em className="text-acc not-italic">체크</em>
      </div>
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <button onClick={() => chDate(-1)} className="bg-sf2 border border-bd text-tx px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold hover:border-acc">
          ← 전날
        </button>
        <span className="font-bold text-[0.95rem] min-w-[130px] text-center">{fmtKo(date)}</span>
        <button onClick={() => chDate(1)} className="bg-sf2 border border-bd text-tx px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold hover:border-acc">
          다음 →
        </button>
        <button onClick={() => setDate(TODAY)} className="bg-sf2 border border-acc text-acc px-3 py-1.5 rounded-lg text-[0.8rem] font-semibold">
          오늘
        </button>
      </div>
      <TrainerTabs value={trF} onChange={setTrF} />
      {!sess.length ? (
        <div className="text-center py-11 text-mu text-[0.86rem] bg-sf rounded-xl border border-dashed border-bd">
          이날 예약된 수업이 없습니다
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sess.map((s) => {
            const mem = getMember(db, s.mid);
            const t = getTrainer(s.tid);
            const st = db.att[`${date}_${s.id}`];
            const cardCls =
              st === "present"
                ? "border-green bg-[rgba(35,209,96,0.05)]"
                : st === "absent"
                ? "border-red bg-[rgba(255,71,87,0.05)]"
                : st === "precancel"
                ? "border-orange bg-[rgba(255,170,0,0.05)]"
                : st === "daycancel"
                ? "border-red bg-[rgba(255,71,87,0.08)]"
                : "border-bd";
            const displayName = s.customName || mem?.name || "?";
            const isHalf = s.time.endsWith(":30");
            return (
              <div key={s.id} className={`bg-sf border-[1.5px] rounded-[11px] p-3.5 flex items-center gap-3 flex-wrap ${cardCls}`}>
                <div className="font-bebas text-[1.15rem] tracking-wider min-w-[48px]" style={{ color: t?.hex || "#888" }}>
                  {s.time}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[0.88rem]">
                    {displayName}
                    {isHalf && <span className="text-[0.58rem] font-black opacity-75 ml-1">·30</span>}
                    {s.isFixed && (
                      <span className="inline-block rounded px-1 text-[0.56rem] font-bold tracking-wider bg-black/20 text-tx ml-1.5 border border-mu">
                        고정
                      </span>
                    )}
                  </div>
                  <div className="text-[0.7rem] text-mu mt-0.5">{t?.name || ""}</div>
                </div>
                <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
                  {(
                    [
                      { a: "present" as const, label: "✓ 출석", cls: "green" },
                      { a: "absent" as const, label: "✗ 결석", cls: "red" },
                      { a: "precancel" as const, label: "📵 사전", cls: "orange" },
                      { a: "daycancel" as const, label: "❌ 당일", cls: "red" },
                    ] as const
                  ).map((b) => {
                    const on = st === b.a;
                    const style = on
                      ? b.cls === "green"
                        ? { background: "var(--green)", borderColor: "var(--green)", color: "#000" }
                        : b.cls === "orange"
                        ? { background: "var(--orange)", borderColor: "var(--orange)", color: "#000" }
                        : { background: "var(--red)", borderColor: "var(--red)", color: "#fff" }
                      : undefined;
                    return (
                      <button
                        key={b.a}
                        style={style}
                        onClick={() => mark(s.id, b.a)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg border-[1.5px] border-bd bg-transparent text-mu font-bold text-[0.73rem] whitespace-nowrap"
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
