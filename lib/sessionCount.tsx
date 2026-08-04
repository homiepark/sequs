"use client";
import { createContext, useContext } from "react";

// key: `${date}_${sess.id}` → 회차 번호 (countSessions 회원만 채워짐)
const Ctx = createContext<Record<string, number>>({});

export const SessionCountProvider = Ctx.Provider;

export function useSessionCounts(): Record<string, number> {
  return useContext(Ctx);
}
