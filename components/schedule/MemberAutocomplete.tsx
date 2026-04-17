"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getTrainer,
  memberHasTrainer,
  memberTrainers,
  type DB,
  type Member,
  type TrainerId,
} from "@/lib/types";

export interface MemberSelection {
  mid: string | null;
  customName: string | null;
}

export function MemberAutocomplete({
  db,
  tid,
  initialMid,
  initialCustomName,
  onChange,
  onRegisterNew,
}: {
  db: DB;
  tid: TrainerId;
  initialMid?: string | null;
  initialCustomName?: string | null;
  onChange: (sel: MemberSelection) => void;
  onRegisterNew: (name: string) => string;
}) {
  const initialName = initialCustomName
    ? initialCustomName
    : initialMid
    ? db.members.find((m) => m.id === initialMid)?.name || ""
    : "";

  const [query, setQuery] = useState(initialName);
  const [focused, setFocused] = useState(false);
  const [selectedMid, setSelectedMid] = useState<string | null>(initialMid || null);
  const [customMode, setCustomMode] = useState<boolean>(!!initialCustomName);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    const byName = (a: Member, b: Member) => a.name.localeCompare(b.name, "ko");
    if (!q) {
      return db.members.filter((m) => memberHasTrainer(m, tid)).slice().sort(byName);
    }
    const primary = db.members
      .filter((m) => memberHasTrainer(m, tid) && m.name.toLowerCase().includes(q))
      .slice()
      .sort(byName);
    const secondary = db.members
      .filter((m) => !memberHasTrainer(m, tid) && m.name.toLowerCase().includes(q))
      .slice()
      .sort(byName);
    return [...primary, ...secondary];
  }, [db.members, tid, q]);

  const exactMatch = q && db.members.some((m) => m.name.toLowerCase() === q);

  function selectMember(m: Member) {
    setSelectedMid(m.id);
    setCustomMode(false);
    setQuery(m.name);
    setFocused(false);
    onChange({ mid: m.id, customName: null });
  }

  function registerNew() {
    const name = query.trim();
    if (!name) return;
    const newId = onRegisterNew(name);
    setSelectedMid(newId);
    setCustomMode(false);
    setQuery(name);
    setFocused(false);
    onChange({ mid: newId, customName: null });
  }

  function addOneOff() {
    const name = query.trim();
    if (!name) return;
    setSelectedMid(null);
    setCustomMode(true);
    setFocused(false);
    onChange({ mid: null, customName: name });
  }

  const selectedMember = selectedMid ? db.members.find((m) => m.id === selectedMid) : null;

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelectedMid(null);
          setCustomMode(false);
          setFocused(true);
          onChange({ mid: null, customName: null });
        }}
        onFocus={() => setFocused(true)}
        placeholder="이름 검색..."
        className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem] outline-none focus:border-acc"
      />
      {selectedMember && !focused && (
        <div className="mt-1.5 flex flex-wrap gap-1 items-center text-[0.68rem]">
          <span className="text-mu">담당:</span>
          {memberTrainers(selectedMember).map((id) => {
            const t = getTrainer(id);
            if (!t) return null;
            return (
              <span
                key={id}
                className="px-1.5 py-0.5 rounded font-bold border"
                style={{ color: t.hex, borderColor: t.hex + "55" }}
              >
                {t.name}
              </span>
            );
          })}
        </div>
      )}
      {customMode && !focused && (
        <div className="mt-1.5 text-[0.7rem] text-orange font-bold">일회성 회원 (미등록)</div>
      )}

      {focused && (
        <div
          className="absolute top-full left-0 right-0 mt-1 bg-sf border border-bd rounded-lg shadow-2xl z-50 max-h-[260px] overflow-y-auto overscroll-contain"
          style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {matches.length > 0 && (
            <div>
              {matches.map((m) => {
                const isPrimary = memberHasTrainer(m, tid);
                const tids = memberTrainers(m);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectMember(m);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-sf2 text-left border-none bg-transparent cursor-pointer"
                  >
                    <span
                      className={`flex-1 text-[0.84rem] font-bold ${
                        isPrimary ? "text-tx" : "text-mu"
                      }`}
                    >
                      {m.name}
                    </span>
                    <span className="flex gap-1">
                      {tids.map((id) => {
                        const t = getTrainer(id);
                        if (!t) return null;
                        return (
                          <span
                            key={id}
                            className="w-2 h-2 rounded-full"
                            style={{ background: t.hex }}
                          />
                        );
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {q && !exactMatch && (
            <div className="border-t border-bd p-2 flex flex-col gap-1.5">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  registerNew();
                }}
                className="w-full px-3 py-2 rounded-md bg-acc text-black font-bold text-[0.82rem] text-left border-none cursor-pointer"
              >
                ➕ &quot;{query.trim()}&quot; 새 회원 등록
                <span className="block text-[0.68rem] opacity-70 mt-0.5 font-medium">
                  담당 트레이너 자동 배정
                </span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  addOneOff();
                }}
                className="w-full px-3 py-1.5 rounded-md bg-transparent text-mu text-[0.76rem] text-left border-none cursor-pointer hover:bg-sf2"
              >
                일회성으로만 추가 (회원 등록 X)
              </button>
            </div>
          )}
          {!q && !matches.length && (
            <div className="p-3 text-center text-mu text-[0.78rem]">
              이 트레이너 담당 회원이 없어요. 이름을 입력해서 추가하세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
