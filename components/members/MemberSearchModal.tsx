"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { useHighlight } from "@/lib/highlight";
import {
  TRAINERS,
  getTrainer,
  memberTrainers,
  type Member,
} from "@/lib/types";
import { Modal } from "../ui/Modal";

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

function toChosung(s: string): string {
  let out = "";
  for (const ch of s) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHOSUNG[Math.floor((code - 0xac00) / 588)];
    } else {
      out += ch;
    }
  }
  return out;
}

function matchesName(name: string, q: string): boolean {
  if (!q) return true;
  const lowerName = name.toLowerCase();
  const lowerQ = q.toLowerCase();
  if (lowerName.includes(lowerQ)) return true;
  return toChosung(name).includes(q);
}

export function MemberSearchModal({ onClose }: { onClose: () => void }) {
  const { db } = useStore();
  const { setHighlightMid } = useHighlight();
  const [q, setQ] = useState("");

  const sorted = useMemo(
    () => [...db.members].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [db.members]
  );
  const filtered = useMemo(
    () => sorted.filter((m) => matchesName(m.name, q.trim())),
    [sorted, q]
  );

  function pick(m: Member) {
    setHighlightMid(m.id);
    onClose();
  }

  return (
    <Modal title="회원 검색" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="이름 또는 초성 (ㅎㄱㄷ)"
        className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.88rem] outline-none focus:border-acc mb-3"
      />
      <div className="text-[0.72rem] text-mu mb-2">
        선택하면 스케줄에서 해당 회원의 모든 예약 (과거·현재·미래)이 점선 테두리로 빛납니다.
      </div>
      <div className="max-h-[50vh] overflow-y-auto overscroll-contain flex flex-col gap-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-mu text-[0.82rem]">일치하는 회원이 없어요</div>
        ) : (
          filtered.map((m) => {
            const tids = memberTrainers(m);
            return (
              <button
                key={m.id}
                onClick={() => pick(m)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sf2 hover:bg-bd text-left w-full border-none cursor-pointer"
              >
                <span className="font-bold text-[0.88rem] flex-1">{m.name}</span>
                <span className="flex gap-1">
                  {tids.map((tid) => {
                    const t = getTrainer(tid);
                    if (!t) return null;
                    return (
                      <span
                        key={tid}
                        className="w-2 h-2 rounded-full"
                        style={{ background: t.hex }}
                      />
                    );
                  })}
                </span>
              </button>
            );
          })
        )}
      </div>
      {TRAINERS.length === 0 && null}
    </Modal>
  );
}
