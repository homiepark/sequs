"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { TRAINERS, type TrainerId } from "@/lib/types";
import { Modal } from "../ui/Modal";

interface ParsedLine {
  raw: string;
  name: string;
  phone: string;
  valid: boolean;
}

function parseLines(text: string): ParsedLine[] {
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
      return { raw, name, phone, valid: !!name };
    });
}

export function BulkAddModal({ onClose }: { onClose: () => void }) {
  const { mutate } = useStore();
  const [text, setText] = useState("");
  const [tids, setTids] = useState<TrainerId[]>([]);

  function toggleTid(id: TrainerId) {
    setTids((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const lines = useMemo(() => parseLines(text), [text]);
  const validCount = lines.filter((l) => l.valid).length;

  function save() {
    if (!validCount) return alert("추가할 회원 이름을 입력해주세요");
    if (!tids.length) return alert("담당 트레이너를 최소 1명 선택해주세요");
    mutate(`회원 ${validCount}명 일괄 추가`, (d) => {
      const now = Date.now();
      lines
        .filter((l) => l.valid)
        .forEach((l, i) => {
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
        <div className="mb-2 max-h-[140px] overflow-y-auto bg-sf2 rounded-lg border border-bd p-2">
          <div className="text-[0.72rem] text-mu mb-1">미리보기 ({validCount}명)</div>
          <div className="flex flex-col gap-1">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-[0.78rem]">
                <span className="text-mu w-5 text-right">{i + 1}</span>
                <span className="font-bold flex-1">{l.name || "(빈 이름)"}</span>
                {l.phone && <span className="text-mu text-[0.72rem]">{l.phone}</span>}
                {!l.valid && <span className="text-red text-[0.7rem]">무시됨</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem]">
          취소
        </button>
        <button
          onClick={save}
          disabled={!validCount || !tids.length}
          className="flex-1 py-2.5 rounded-lg bg-acc text-black font-bold text-[0.83rem] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {validCount ? `${validCount}명 추가` : "추가"}
        </button>
      </div>
    </Modal>
  );
}
