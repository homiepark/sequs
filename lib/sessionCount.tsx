"use client";
import { createContext, useContext } from "react";
import type { ScheduleMeta } from "./types";

// countSessions 회원의 회차/누적/VIP 메타. 스케줄 트리 전체에 전달.
const Ctx = createContext<ScheduleMeta>({ ordinals: {}, members: {} });

export const SessionCountProvider = Ctx.Provider;

export function useScheduleMeta(): ScheduleMeta {
  return useContext(Ctx);
}
