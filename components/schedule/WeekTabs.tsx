"use client";
import { useEffect, useMemo, useRef } from "react";
import { fmtDateToISO, weekDates } from "@/lib/types";

function weekStart(offset: number): Date {
  return weekDates(offset)[0];
}

function offsetForDate(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  const dow = today.getDay();
  const todayToMon = dow === 0 ? -6 : 1 - dow;
  return Math.round((diff + Math.abs(todayToMon)) / 7 - Math.abs(todayToMon) / 7);
}

function monthMondays(year: number, month: number): Date[] {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const mon = new Date(first);
  mon.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const list: Date[] = [];
  let d = new Date(mon);
  while (d <= last) {
    list.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return list;
}

function mondayOffset(mon: Date): number {
  const today = new Date();
  const dow = today.getDay();
  const todayMon = new Date(today);
  todayMon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  todayMon.setHours(0, 0, 0, 0);
  const target = new Date(mon);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - todayMon.getTime()) / (86400000 * 7));
}

export function WeekTabs({
  weekOff,
  year,
  month,
  onPick,
}: {
  weekOff: number;
  year: number;
  month: number;
  onPick: (off: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => {
    return monthMondays(year, month).map((d) => {
      const sun = new Date(d);
      sun.setDate(d.getDate() + 5); // Sat
      const label = `${d.getMonth() + 1}/${d.getDate()}~${sun.getMonth() + 1}/${sun.getDate()}`;
      const off = mondayOffset(d);
      return { off, label, key: fmtDateToISO(d) };
    });
  }, [year, month]);

  useEffect(() => {
    if (selRef.current && scrollRef.current) {
      const sel = selRef.current;
      const wrap = scrollRef.current;
      const left = sel.offsetLeft - wrap.clientWidth / 2 + sel.clientWidth / 2;
      wrap.scrollTo({ left, behavior: "smooth" });
    }
  }, [weekOff, year, month]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar -mx-3.5 px-3.5"
    >
      {items.map((it) => {
        const on = it.off === weekOff;
        return (
          <button
            key={it.key}
            ref={on ? selRef : undefined}
            onClick={() => onPick(it.off)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[0.78rem] font-bold whitespace-nowrap border-[1.5px] transition ${
              on
                ? "bg-acc text-black border-acc"
                : "bg-sf2 text-tx border-bd hover:border-acc hover:text-acc"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export { offsetForDate };
