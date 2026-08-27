"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  DAYS_SHORT,
  HOURS,
  TRAINERS,
  fmtDateToISO,
  formatHourLabel,
  getSessionsForDate,
  isSlotBlocked,
  type TrainerId,
} from "@/lib/types";

type AvailPeriod = "4w" | "8w" | "12w" | "year";

export function AvailabilityPage() {
  const { db } = useStore();
  const [period, setPeriod] = useState<AvailPeriod>("8w");
  const [trF, setTrF] = useState<TrainerId | "all">("all");
  const [metric, setMetric] = useState<"avg" | "allEmpty" | "allBusy">("allBusy");

  const trainers: TrainerId[] = trF === "all" ? TRAINERS.map((t) => t.id) : [trF];
  const trainerCount = trainers.length;

  const { grid, weeksObserved, dateRangeLabel } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let startDate: Date;
    if (period === "year") {
      startDate = new Date(today.getFullYear(), 0, 1);
    } else {
      const weeks = period === "4w" ? 4 : period === "8w" ? 8 : 12;
      startDate = new Date(today);
      startDate.setDate(today.getDate() - weeks * 7);
    }

    const buckets: number[][][] = Array.from({ length: 6 }, () =>
      Array.from({ length: HOURS.length }, () => [] as number[])
    );

    const d = new Date(startDate);
    while (d < today) {
      const jsDow = d.getDay();
      if (jsDow !== 0) {
        const dowIdx = jsDow - 1;
        const ds = fmtDateToISO(d);
        const daySessions = getSessionsForDate(db, ds);
        HOURS.forEach((h, hIdx) => {
          const hHalf = h.replace(":00", ":30");
          let emptyCount = 0;
          for (const tid of trainers) {
            const blocked = isSlotBlocked(db, ds, tid, h);
            if (blocked) {
              emptyCount++;
              continue;
            }
            const sess =
              daySessions.find((s) => s.tid === tid && s.time === h) ||
              daySessions.find((s) => s.tid === tid && s.time === hHalf);
            if (!sess) {
              emptyCount++;
              continue;
            }
            const st = db.att[`${ds}_${sess.id}`];
            if (st === "precancel" || st === "daycancel") {
              emptyCount++;
            }
          }
          buckets[dowIdx][hIdx].push(emptyCount);
        });
      }
      d.setDate(d.getDate() + 1);
    }

    const grid: {
      dow: number;
      hIdx: number;
      hour: string;
      avgEmpty: number;
      allEmptyPct: number;
      allBusyPct: number;
      observations: number;
    }[] = [];
    for (let dow = 0; dow < 6; dow++) {
      for (let hIdx = 0; hIdx < HOURS.length; hIdx++) {
        const arr = buckets[dow][hIdx];
        const obs = arr.length;
        const avgEmpty = obs ? arr.reduce((s, x) => s + x, 0) / obs : 0;
        const allEmptyCount = arr.filter((x) => x === trainerCount).length;
        const allBusyCount = arr.filter((x) => x === 0).length;
        const allEmptyPct = obs ? (allEmptyCount / obs) * 100 : 0;
        const allBusyPct = obs ? (allBusyCount / obs) * 100 : 0;
        grid.push({
          dow,
          hIdx,
          hour: HOURS[hIdx],
          avgEmpty,
          allEmptyPct,
          allBusyPct,
          observations: obs,
        });
      }
    }

    const weeksObserved =
      period === "year"
        ? Math.round((today.getTime() - startDate.getTime()) / 604800000)
        : period === "4w"
        ? 4
        : period === "8w"
        ? 8
        : 12;

    const dateRangeLabel = `${fmtDateToISO(startDate).slice(5).replace("-", "/")} ~ ${fmtDateToISO(
      new Date(today.getTime() - 86400000)
    )
      .slice(5)
      .replace("-", "/")}`;

    return { grid, weeksObserved, dateRangeLabel };
  }, [db, period, trF, trainers, trainerCount]);

  // Sort by metric: hiring safety uses ascending allBusyPct
  const topAvail =
    metric === "allBusy"
      ? [...grid]
          .filter((g) => g.observations > 0)
          .sort((a, b) => a.allBusyPct - b.allBusyPct)
          .slice(0, 10)
      : [...grid].sort((a, b) => b.avgEmpty - a.avgEmpty).slice(0, 10);
  const topBusy =
    metric === "allBusy"
      ? [...grid]
          .filter((g) => g.observations > 0)
          .sort((a, b) => b.allBusyPct - a.allBusyPct)
          .slice(0, 10)
      : [...grid]
          .filter((g) => g.observations > 0)
          .sort((a, b) => a.avgEmpty - b.avgEmpty)
          .slice(0, 10);

  const metricLabel =
    metric === "avg"
      ? trainerCount === 1
        ? "빈 슬롯 확률"
        : `평균 빈 슬롯 / ${trainerCount}`
      : metric === "allEmpty"
      ? trainerCount === 1
        ? "빈 슬롯 확률"
        : "완전 빈 확률"
      : "🚨 4명 전원 근무 확률 (5명 위험)";

  function cellColor(g: {
    avgEmpty: number;
    allEmptyPct: number;
    allBusyPct: number;
    observations: number;
  }): string {
    if (g.observations === 0) return "hsl(0, 0%, 22%)";
    let ratio: number;
    if (metric === "avg") {
      ratio = g.avgEmpty / Math.max(1, trainerCount);
    } else if (metric === "allEmpty") {
      ratio = g.allEmptyPct / 100;
    } else {
      // allBusy: LOW % = safe (green), HIGH % = risky (red)
      ratio = 1 - g.allBusyPct / 100;
    }
    const hue = 4 + 116 * ratio;
    return `hsla(${hue}, 68%, 46%, 0.85)`;
  }

  function cellText(g: {
    avgEmpty: number;
    allEmptyPct: number;
    allBusyPct: number;
    observations: number;
  }): string {
    if (g.observations === 0) return "-";
    if (metric === "avg") {
      if (trainerCount === 1) return `${Math.round((g.avgEmpty / trainerCount) * 100)}%`;
      return g.avgEmpty.toFixed(1);
    }
    if (metric === "allEmpty") return `${Math.round(g.allEmptyPct)}%`;
    return `${Math.round(g.allBusyPct)}%`;
  }

  return (
    <div>
      <div className="font-bebas text-[1.6rem] tracking-[2px] mb-1">
        🕐 <em className="text-acc not-italic">슬롯 활용도</em>
      </div>
      <div className="text-[0.78rem] text-mu mb-3">
        {dateRangeLabel} · 약 {weeksObserved}주 관측
      </div>

      <div className="mb-4 px-3 py-2.5 rounded-lg bg-[rgba(232,255,71,0.08)] border border-acc/40">
        <div className="text-[0.82rem] text-acc font-bold mb-1">
          💡 신규 트레이너 채용 가이드
        </div>
        <div className="text-[0.78rem] text-tx leading-snug">
          센터 혼잡 방지 위해 <b>최대 4명 동시 근무 원칙 유지</b>. 5번째 트레이너 채용 시,
          아래 히트맵의 <b className="text-green">🟢 초록 시간대</b>가 안전합니다 —
          현재 4명이 동시에 다 근무하는 경우가 드문 시간대라 5번째가 들어와도 5명 동시 진행이 잘 안 생김.
          하단 <b>&quot;채용 안전 TOP 10&quot;</b> 리스트도 참고.
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1">
          {(["4w", "8w", "12w", "year"] as AvailPeriod[]).map((p) => {
            const labels: Record<AvailPeriod, string> = {
              "4w": "4주",
              "8w": "8주",
              "12w": "12주",
              year: "올해",
            };
            const on = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md text-[0.76rem] font-bold border ${
                  on
                    ? "bg-acc text-black border-acc"
                    : "bg-sf2 text-mu border-bd hover:border-acc hover:text-acc"
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1 ml-1 flex-wrap">
          <button
            onClick={() => setTrF("all")}
            className={`px-2.5 py-1 rounded-md text-[0.76rem] font-bold border ${
              trF === "all"
                ? "bg-acc text-black border-acc"
                : "bg-sf2 text-mu border-bd hover:border-acc hover:text-acc"
            }`}
          >
            전체
          </button>
          {TRAINERS.map((t) => {
            const on = trF === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTrF(t.id)}
                className="px-2.5 py-1 rounded-md text-[0.76rem] font-bold border"
                style={{
                  background: on ? t.hex : "transparent",
                  color: on ? "#000" : t.hex,
                  borderColor: t.hex,
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        {trainerCount > 1 && (
          <div className="flex gap-1 ml-auto flex-wrap">
            <button
              onClick={() => setMetric("allBusy")}
              className={`px-2.5 py-1 rounded-md text-[0.72rem] font-bold border ${
                metric === "allBusy"
                  ? "bg-orange text-black border-orange"
                  : "bg-sf2 text-mu border-bd hover:border-orange hover:text-orange"
              }`}
              title="현재 4명이 동시에 다 근무 중일 확률 — 낮을수록 5번째 채용에 안전"
            >
              🚨 5명 위험
            </button>
            <button
              onClick={() => setMetric("avg")}
              className={`px-2.5 py-1 rounded-md text-[0.72rem] font-bold border ${
                metric === "avg"
                  ? "bg-orange text-black border-orange"
                  : "bg-sf2 text-mu border-bd hover:border-orange hover:text-orange"
              }`}
            >
              평균 빈 슬롯
            </button>
            <button
              onClick={() => setMetric("allEmpty")}
              className={`px-2.5 py-1 rounded-md text-[0.72rem] font-bold border ${
                metric === "allEmpty"
                  ? "bg-orange text-black border-orange"
                  : "bg-sf2 text-mu border-bd hover:border-orange hover:text-orange"
              }`}
            >
              완전 빈 확률
            </button>
          </div>
        )}
      </div>

      <div className="text-[0.72rem] text-mu mb-2">
        📊 {metricLabel} ·{" "}
        {metric === "allBusy"
          ? "색상: 초록=채용 안전 (4명 동시 근무 드묾), 빨강=위험 (자주 꽉참)"
          : "색상: 빨강=꽉참, 초록=비어있음"}{" "}
        (차단 슬롯도 빈 시간으로 포함)
      </div>

      <div className="overflow-x-auto rounded-lg border border-bd mb-3">
        <table className="w-full border-collapse" style={{ minWidth: 380 }}>
          <thead>
            <tr className="bg-sf2">
              <th className="px-2 py-1.5 text-[0.7rem] text-mu font-bold border-b border-bd sticky left-0 bg-sf2 z-[1]">
                시간
              </th>
              {DAYS_SHORT.map((d) => (
                <th
                  key={d}
                  className="px-2 py-1.5 text-[0.72rem] text-tx font-bold border-b border-bd text-center"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h, hIdx) => (
              <tr key={h}>
                <td className="px-2 py-0 text-[0.72rem] text-mu font-bold border-b border-bd sticky left-0 bg-sf z-[1] text-center whitespace-nowrap">
                  {formatHourLabel(h)}
                </td>
                {DAYS_SHORT.map((_, dow) => {
                  const g = grid.find((x) => x.dow === dow && x.hIdx === hIdx)!;
                  return (
                    <td
                      key={dow}
                      className="border-b border-bd text-center align-middle"
                      style={{
                        background: cellColor(g),
                        color: "#000",
                        fontWeight: 700,
                        fontSize: "0.78rem",
                        padding: "6px 4px",
                        minWidth: 42,
                      }}
                      title={
                        g.observations
                          ? `${DAYS_SHORT[dow]} ${h} — 평균 ${g.avgEmpty.toFixed(2)}${
                              trainerCount > 1 ? `/${trainerCount}` : ""
                            } · 완전 빈 ${Math.round(g.allEmptyPct)}% · 4명 다 근무 ${Math.round(
                              g.allBusyPct
                            )}% (${g.observations}주 관측)`
                          : "관측 없음"
                      }
                    >
                      {cellText(g)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TopSlotList
          title={metric === "allBusy" ? "🟢 채용 안전 TOP 10" : "🟢 가장 여유로운 TOP 10"}
          items={topAvail}
          trainerCount={trainerCount}
          accent="text-green"
          metric={metric}
        />
        <TopSlotList
          title={metric === "allBusy" ? "🔴 채용 위험 TOP 10" : "🔴 가장 붐비는 TOP 10"}
          items={topBusy}
          trainerCount={trainerCount}
          accent="text-red"
          metric={metric}
        />
      </div>
    </div>
  );
}

function TopSlotList({
  title,
  items,
  trainerCount,
  accent,
  metric,
}: {
  title: string;
  items: {
    dow: number;
    hour: string;
    avgEmpty: number;
    allEmptyPct: number;
    allBusyPct: number;
    observations: number;
  }[];
  trainerCount: number;
  accent: string;
  metric: "avg" | "allEmpty" | "allBusy";
}) {
  return (
    <div className="bg-sf border border-bd rounded-xl p-3">
      <div className={`font-bold text-[0.85rem] mb-2 ${accent}`}>{title}</div>
      <div className="flex flex-col gap-1">
        {items.map((g, i) => {
          const detail =
            metric === "allBusy"
              ? `4명 다 근무 ${Math.round(g.allBusyPct)}%`
              : trainerCount > 1
              ? `평균 ${g.avgEmpty.toFixed(1)}/${trainerCount}명 빔`
              : `${Math.round((g.avgEmpty / trainerCount) * 100)}% 빔`;
          return (
            <div
              key={`${g.dow}_${g.hour}_${i}`}
              className="flex items-center justify-between text-[0.78rem] px-1 py-1 border-b border-bd/60 last:border-b-0"
            >
              <span className="text-mu font-bebas w-6">{i + 1}</span>
              <span className="text-tx font-bold flex-1">
                {DAYS_SHORT[g.dow]}요일 {formatHourLabel(g.hour)}
              </span>
              <span className="text-mu text-[0.72rem]">{detail}</span>
            </div>
          );
        })}
        {!items.length && <div className="text-mu text-[0.78rem]">관측 없음</div>}
      </div>
    </div>
  );
}
