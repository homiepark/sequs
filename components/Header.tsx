"use client";
import { useStore } from "@/lib/store";
import type { Page } from "./App";

const PAGES: { id: Page; label: string }[] = [
  { id: "schedule", label: "스케줄" },
  { id: "fixed", label: "고정" },
  { id: "attendance", label: "출석" },
  { id: "members", label: "회원" },
  { id: "stats", label: "통계" },
];

export function Header({ page, onChange }: { page: Page; onChange: (p: Page) => void }) {
  const { sync, canUndo, undo } = useStore();
  const syncLabel =
    sync === "syncing" ? "☁️ 동기화 중" : sync === "error" ? "⚠️ 오류" : "💾 로컬";
  const syncColor = sync === "syncing" ? "text-green" : "text-mu";

  return (
    <header className="bg-sf border-b border-bd px-4 h-[54px] flex items-center gap-2.5 sticky top-0 z-[100]">
      <div className="font-bebas text-[1.3rem] tracking-[3px] text-acc leading-none flex-shrink-0">
        SEQMV
        <small className="block text-mu text-[0.6rem] font-sans tracking-normal font-light">
          시퀀스 무브먼트
        </small>
      </div>
      <span className={`text-[0.68rem] ${syncColor} flex-shrink-0`}>{syncLabel}</span>
      <nav className="flex gap-0.5 ml-auto overflow-x-auto no-scrollbar flex-shrink-0">
        {PAGES.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`bg-transparent border-none font-sans text-[0.76rem] font-semibold px-2.5 py-1.5 rounded-[7px] cursor-pointer whitespace-nowrap ${
              page === p.id ? "bg-sf2 text-acc" : "text-mu"
            }`}
          >
            {p.label}
          </button>
        ))}
      </nav>
      {canUndo && (
        <button
          onClick={undo}
          title="되돌리기 (Ctrl+Z)"
          className="ml-1 bg-sf2 border border-bd text-tx px-2.5 py-1.5 rounded-[7px] text-[0.76rem] font-bold flex-shrink-0 hover:border-acc hover:text-acc"
        >
          ↩
        </button>
      )}
    </header>
  );
}
