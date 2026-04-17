"use client";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { SchedulePage } from "./pages/SchedulePage";
import { FixedPage } from "./pages/FixedPage";
import { AttendancePage } from "./pages/AttendancePage";
import { MembersPage } from "./pages/MembersPage";
import { StatsPage } from "./pages/StatsPage";
import { Toast } from "./ui/Toast";
import { PWARegister } from "./PWARegister";
import { useStore } from "@/lib/store";

export type Page = "schedule" | "fixed" | "attendance" | "members" | "stats";

export function App() {
  const [page, setPage] = useState<Page>("schedule");
  const { undo, lastAction } = useStore();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!lastAction) return;
    setToast(lastAction);
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [lastAction]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  return (
    <>
      <Header page={page} onChange={setPage} />
      <main className="px-3.5 pt-3.5 pb-[60px] max-w-[1300px] mx-auto">
        {page === "schedule" && <SchedulePage />}
        {page === "fixed" && <FixedPage />}
        {page === "attendance" && <AttendancePage />}
        {page === "members" && <MembersPage />}
        {page === "stats" && <StatsPage />}
      </main>
      {toast && <Toast text={toast} />}
      <PWARegister />
    </>
  );
}
