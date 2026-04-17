"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { TRAINERS, getTrainer, memberTrainers, type Member, type TrainerId } from "@/lib/types";
import { Modal } from "../ui/Modal";

interface ParsedLine {
  raw: string;
  name: string;
  phone: string;
  valid: boolean;
  existing: Member[];
}

function parseLines(text: string, members: Member[]): ParsedLine[] {
  return text
    .split(/\r?\n/)
    .map((raw) => raw.trim())
    .filter((s) => s.length > 0)
    .map((raw) => {
      const parts = raw.split(/[,\t]+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
      let name = "";
      let phone = "";
      if (parts.length === 1) {
        const m = parts[0].match(/^(.+?)\s+(\d[\d\- ]*)$/);
        if (m) {
          name = m[1].trim();
          phone = m[2].trim();
        } else {
          name = parts[0];
        }
      } else {
        name = parts[0];
        phone = parts.slice(1).join(" ");
      }
      const existing = name ? members.filter((m) => m.name.trim() === name) : [];
      return { raw, name, phone, valid: !!name, existing };
    });
}

export function BulkAddModal({ onClose }: { onClose: () => void }) {
  const { db, mutate } = useStore();
  const [text, setText] = useState("");
  const [tids, setTids] = useState<TrainerId[]>([]);
  const [includeDupes, setIncludeDupes] = useState(false);

  function toggleTid(id: TrainerId) {
    setTids((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const lines = useMemo(() => parseLines(text, db.members), [text, db.members]);
  const newLines = lines.filter((l) => l.valid && !l.existing.length);
  const dupLines = lines.filter((l) => l.valid && l.existing.length > 0);
  const toAddCount = includeDupes
    ? newLines.length + dupLines.length
    : newLines.length;

  function save() {
    if (!toAddCount) return alert("추가할 회원이 없습니다");
    if (!tids.length) return alert("담당 트레이너를 최소 1명 선택해주세요");
    const toAdd = includeDupes ? [...newLines, ...dupLines] : newLines;
    mutate(`회원 ${toAdd.length}명 일괄 추가`, (d) => {
      const now = Date.now();
      toAdd.forEach((l, i) => {
        d.members.push({
          id: "m" + (now + i),
          name: l.name,
          phone: l.phone,
          tid: tids[0],
          tids,
        });
      });
    });
    onClose();
  }

  return (
    <Modal title="회원 대량 추가" wide onClose={onClose}>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1.5 font-medium">
          공통 담당 트레이너 (최소 1명)
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TRAINERS.map((t) => {
            const on = tids.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTid(t.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border-[1.5px] text-[0.82rem] font-bold transition"
                style={{
                  background: on ? t.hex : "transparent",
                  borderColor: on ? t.hex : "var(--bd)",
                  color: on ? "#000" : "var(--mu)",
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: t.hex }} />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-2">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">
          한 줄에 한 명 (이름 또는 <code className="text-acc">이름, 010-0000-0000</code>)
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={`홍길동\n김민수, 010-1234-5678\n이영희  010-9999-0000\n박철수`}
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.86rem] outline-none focus:border-acc font-mono resize-none"
        />
        <div className="text-[0.72rem] text-mu mt-1.5">
          💡 엑셀에서 이름·연락처 두 칸 복사해서 붙여넣어도 인식됩니다.
        </div>
      </div>

      {text.trim() && (
        <>
          <div className="mb-2 max-h-[180px] overflow-y-auto bg-sf2 rounded-lg border border-bd p-2">
            <div className="text-[0.72rem] text-mu mb-1 flex gap-2 flex-wrap">
              <span>미리보기</span>
              <span className="text-green">신규 {newLines.length}</span>
              {dupLines.length > 0 && (
                <span className="text-orange">중복 {dupLines.length}{includeDupes ? " (추가됨)" : " (스킵)"}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {lines.map((l, i) => {
                const isDup = l.existing.length > 0;
                const willAdd = l.valid && (!isDup || includeDupes);
                return (
                  <div key={i} className="flex items-start gap-2 text-[0.78rem]">
                    <span className="text-mu w-5 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`font-bold ${willAdd ? "text-tx" : "text-mu line-through"}`}
                        >
                          {l.name || "(빈 이름)"}
                        </span>
                        {l.phone && (
                          <span className="text-mu text-[0.7rem]">{l.phone}</span>
                        )}
                        {isDup && (
                          <span className="text-[0.66rem] font-bold text-orange px-1 py-0.5 rounded border border-orange/60">
                            {includeDupes ? "⚠ 중복·추가됨" : "⚠ 이미 등록됨"}
                          </span>
                        )}
                        {!l.valid && (
                          <span className="text-red text-[0.7rem]">무시됨</span>
                        )}
                      </div>
                      {isDup && (
                        <div className="flex flex-wrap gap-1.5 mt-0.5 text-[0.68rem] text-mu">
                          <span>기존:</span>
                          {l.existing.map((m) => (
                            <span key={m.id} className="flex items-center gap-1">
                              {memberTrainers(m).map((tid) => {
                                const t = getTrainer(tid);
                                return t ? (
                                  <span
                                    key={tid}
                                    style={{ color: t.hex }}
                                  >
                                    {t.name}
                                  </span>
                                ) : null;
                              })}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {dupLines.length > 0 && (
            <label className="flex items-center gap-2 mb-2 cursor-pointer px-1">
              <input
                type="checkbox"
                checked={includeDupes}
                onChange={(e) => setIncludeDupes(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="text-[0.8rem]">동명이인일 수 있음 — 중복도 강제 추가</span>
            </label>
          )}
        </>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem]">
          취소
        </button>
        <button
          onClick={save}
          disabled={!toAddCount || !tids.length}
          className="flex-1 py-2.5 rounded-lg bg-acc text-black font-bold text-[0.83rem] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {toAddCount ? `${toAddCount}명 추가` : "추가"}
        </button>
      </div>
    </Modal>
  );
}
