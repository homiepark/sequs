"use client";
import { createContext, useContext, useMemo, useState } from "react";

interface HighlightCtx {
  highlightMid: string | null;
  setHighlightMid: (mid: string | null) => void;
}

const Ctx = createContext<HighlightCtx | null>(null);

export function HighlightProvider({ children }: { children: React.ReactNode }) {
  const [highlightMid, setHighlightMid] = useState<string | null>(null);
  const value = useMemo(() => ({ highlightMid, setHighlightMid }), [highlightMid]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHighlight(): HighlightCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useHighlight must be used within HighlightProvider");
  return v;
}
