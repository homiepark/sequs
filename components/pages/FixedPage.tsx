"use client";
import { useState } from "react";
import { DAYS_FULL, DAYS_SHORT, HOURS, TRAINERS, getMember, type FixedBlock, type TrainerId } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Modal } from "../ui/Modal";

export function FixedPage() {
  const { db, mutate } = useStore();
  const [editBlock, setEditBlock] = useState<FixedBlock | null>(null);
  const [addBlock, setAddBlock] = useState(false);
  const hasSched = db.fixedSchedules.length > 0;
  const blocks = db.fixedBlocks || [];

  return (
    <div>
      <div className="font-bebas text-[1.6rem] tracking-[2px] mb-3">
        고정 <em className="text-acc not-italic">일정</em>
      </div>
      <p className="text-[0.8rem] text-mu mb-3.5">
        수업은 예약 시 &quot;고정 수업으로 등록&quot; 체크로 추가. 시간 차단은 아래에서 관리.
      </p>

      <section className="mb-6">
        <h3 className="text-[0.82rem] font-bold text-mu mb-2 uppercase tracking-widest">고정 수업</h3>
        {!hasSched ? (
          <div className="text-center py-11 text-mu text-[0.86rem] bg-sf rounded-xl border border-dashed border-bd">
            고정 수업 없음
          </div>
        ) : (
          TRAINERS.map((t) => {
            const items = db.fixedSchedules
              .filter((f) => f.tid === t.id)
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time));
            return (
              <div key={t.id} className="bg-sf border border-bd rounded-xl p-4 mb-3.5">
                <h4 className="text-[0.78rem] font-bold tracking-widest mb-3 uppercase" style={{ color: t.hex }}>
                  {t.name}
                </h4>
                {!items.length ? (
                  <div className="text-mu text-[0.8rem]">없음</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((f) => {
                      const mem = getMember(db, f.mid);
                      return (
                        <div key={f.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-sf2 rounded-lg">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.hex }} />
                          <div className="flex-1">
                            <div className="font-bold text-[0.84rem]">
                              {f.customName || mem?.name || "?"}
                            </div>
                            <div className="text-[0.7rem] text-mu mt-0.5">
                              {DAYS_FULL[f.dayOfWeek - 1]} {f.time}
                              {f.startDate && (
                                <>
                                  {" · "}
                                  {f.startDate.slice(5).replace("-", "/")}~
                                  {f.endDate ? f.endDate.slice(5).replace("-", "/") : "종료없음"}
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (!confirm("고정일정을 삭제할까요?")) return;
                              mutate("고정일정 삭제", (d) => {
                                d.fixedSchedules = d.fixedSchedules.filter((x) => x.id !== f.id);
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-transparent text-red border border-red font-bold text-[0.78rem]"
                          >
                            삭제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[0.82rem] font-bold text-mu uppercase tracking-widest">
            고정 시간 차단
          </h3>
          <button
            onClick={() => setAddBlock(true)}
            className="px-3 py-1.5 rounded-lg bg-acc text-black font-bold text-[0.78rem]"
          >
            + 추가
          </button>
        </div>
        <p className="text-[0.72rem] text-mu mb-2.5">
          매주 반복되는 점심시간·미팅 등을 한 번에 차단. 예: 매주 수 · 12~13시.
        </p>
        {!blocks.length ? (
          <div className="text-center py-10 text-mu text-[0.84rem] bg-sf rounded-xl border border-dashed border-bd">
            등록된 차단 없음
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {blocks
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((b) => {
                const trainerLabel =
                  b.tid === "all"
                    ? "전체 트레이너"
                    : TRAINERS.find((t) => t.id === b.tid)?.name || "?";
                const timesLabel = b.times
                  .sort()
                  .reduce<string[]>((acc, t) => {
                    const last = acc[acc.length - 1];
                    if (last && last.endsWith(prevHour(t))) {
                      acc[acc.length - 1] = last.split("~")[0] + "~" + t;
                    } else {
                      acc.push(t + "~" + t);
                    }
                    return acc;
                  }, [])
                  .map((r) => {
                    const [from, to] = r.split("~");
                    return from === to ? from : `${from}~${plusHour(to)}`;
                  })
                  .join(", ");
                return (
                  <div key={b.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-sf border border-bd rounded-lg">
                    <div className="flex-1">
                      <div className="font-bold text-[0.84rem]">
                        {b.label || "차단"}
                      </div>
                      <div className="text-[0.7rem] text-mu mt-0.5">
                        매주 {DAYS_FULL[b.dayOfWeek - 1]} · {timesLabel} · {trainerLabel}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditBlock(b)}
                      className="px-2.5 py-1.5 rounded-lg bg-sf2 text-tx border border-bd font-bold text-[0.76rem]"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("고정 차단을 삭제할까요?")) return;
                        mutate("고정 차단 삭제", (d) => {
                          d.fixedBlocks = (d.fixedBlocks || []).filter((x) => x.id !== b.id);
                        });
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-transparent text-red border border-red font-bold text-[0.76rem]"
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {(addBlock || editBlock) && (
        <BlockModal
          block={editBlock}
          onClose={() => {
            setAddBlock(false);
            setEditBlock(null);
          }}
        />
      )}
    </div>
  );
}

function prevHour(t: string): string {
  const h = parseInt(t.slice(0, 2));
  return `${String(h - 1).padStart(2, "0")}:00`;
}

function plusHour(t: string): string {
  const h = parseInt(t.slice(0, 2));
  return `${String(h + 1).padStart(2, "0")}:00`;
}

function BlockModal({ block, onClose }: { block: FixedBlock | null; onClose: () => void }) {
  const { mutate } = useStore();
  const [label, setLabel] = useState(block?.label || "");
  const [tid, setTid] = useState<TrainerId | "all">(block?.tid || "all");
  const [dayOfWeek, setDayOfWeek] = useState<number>(block?.dayOfWeek || 1);
  const [times, setTimes] = useState<string[]>(block?.times || []);

  function toggleTime(h: string) {
    setTimes((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h].sort()));
  }

  function save() {
    if (!times.length) return alert("시간을 하나 이상 선택해주세요");
    if (block) {
      mutate("고정 차단 수정", (d) => {
        const b = (d.fixedBlocks || []).find((x) => x.id === block.id);
        if (b) {
          b.label = label;
          b.tid = tid;
          b.dayOfWeek = dayOfWeek;
          b.times = times;
        }
      });
    } else {
      mutate("고정 차단 추가", (d) => {
        (d.fixedBlocks = d.fixedBlocks || []).push({
          id: "fb" + Date.now(),
          label,
          tid,
          dayOfWeek,
          times,
        });
      });
    }
    onClose();
  }

  return (
    <Modal title={block ? "고정 차단 수정" : "고정 차단 추가"} onClose={onClose}>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">라벨 (선택)</label>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="점심, 회의 등"
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
        />
      </div>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">트레이너</label>
        <select
          value={tid}
          onChange={(e) => setTid(e.target.value as TrainerId | "all")}
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
        >
          <option value="all">전체 트레이너</option>
          {TRAINERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">요일</label>
        <div className="flex gap-1 flex-wrap">
          {DAYS_SHORT.map((d, i) => {
            const dow = i + 1;
            const on = dayOfWeek === dow;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDayOfWeek(dow)}
                className={`flex-1 min-w-[42px] py-2 rounded-lg border-[1.5px] font-bold text-[0.82rem] ${
                  on ? "bg-acc text-black border-acc" : "bg-sf2 text-mu border-bd"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">
          차단할 시간 (여러 개 선택 가능)
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {HOURS.map((h) => {
            const on = times.includes(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => toggleTime(h)}
                className={`py-1.5 rounded-md border font-bebas text-[0.85rem] tracking-wider ${
                  on ? "bg-[#c9a800] text-black border-[#c9a800]" : "bg-sf2 text-mu border-bd"
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem]">
          취소
        </button>
        <button onClick={save} className="flex-1 py-2.5 rounded-lg bg-acc text-black font-bold text-[0.83rem]">
          저장
        </button>
      </div>
    </Modal>
  );
}
