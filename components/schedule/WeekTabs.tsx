"use client";
import { useEffect, useMemo, useRef } from "react";
import { fmtDateToISO, weekDates } from "@/lib/types";

const WEEK_RANGE = 10;

function weekStart(offset: number): Date {
  return weekDates(offset)[0];
}

export function WeekTabs({
  weekOff,
  onPick,
}: {
  weekOff: number;
  onPick: (off: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLButtonElement>(null);

  const items = useMemo(() => {
    const arr: { off: number; label: string; key: string }[] = [];
    for (let i = weekOff - WEEK_RANGE; i <= weekOff + WEEK_RANGE; i++) {
      const d = weekStart(i);
      const m = d.getMonth() + 1;
      const day = d.getDate();
      arr.push({
        off: i,
        label: `${m}월 ${day}일 주`,
        key: fmtDateToISO(d),
      });
    }
    return arr;
  }, [weekOff]);

  useEffect(() => {
    if (selRef.current && scrollRef.current) {
      const sel = selRef.current;
      const wrap = scrollRef.current;
      const left = sel.offsetLeft - wrap.clientWidth / 2 + sel.clientWidth / 2;
      wrap.scrollTo({ left, behavior: "smooth" });
    }
  }, [weekOff]);

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
                : "bg-sf2 text-mu border-bd hover:border-acc hover:text-acc"
            }`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
