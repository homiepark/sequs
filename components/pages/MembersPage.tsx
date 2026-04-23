"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  AVATAR_COLORS,
  TRAINERS,
  fmtKo,
  getSessionsForDate,
  getTrainer,
  memberHasTrainer,
  memberTrainers,
  type DB,
  type Member,
  type MemberMemoEntry,
  type TrainerId,
} from "@/lib/types";
import { TrainerTabs } from "../ui/TrainerTabs";
import { Modal } from "../ui/Modal";
import { BulkAddModal } from "../members/BulkAddModal";
import { MemberScheduleModal } from "../members/MemberScheduleModal";

function uniqueDatesForMember(db: DB, mid: string): string[] {
  const dates = new Set<string>();
  db.sessions.filter((s) => s.mid === mid).forEach((s) => dates.add(s.date));
  // For fixed schedules: produce dates from startDate up to today
  const today = new Date().toISOString().slice(0, 10);
  db.fixedSchedules
    .filter((f) => f.mid === mid)
    .forEach((f) => {
      const start = f.startDate || "2020-01-01";
      const end = f.endDate && f.endDate < today ? f.endDate : today;
      const s = new Date(start + "T00:00:00");
      const e = new Date(end + "T00:00:00");
      for (let x = new Date(s); x <= e; x.setDate(x.getDate() + 1)) {
        const dow = x.getDay() === 0 ? 7 : x.getDay();
        if (dow !== f.dayOfWeek) continue;
        const ds = x.toISOString().slice(0, 10);
        if (f.skippedDates?.includes(ds)) continue;
        dates.add(ds);
      }
    });
  return Array.from(dates);
}

export function MembersPage() {
  const { db, mutate } = useStore();
  const [q, setQ] = useState("");
  const [trF, setTrF] = useState("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [scheduleFor, setScheduleFor] = useState<Member | null>(null);

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const filtered = useMemo(() => {
    let list = db.members.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
    if (trF !== "all") list = list.filter((m) => memberHasTrainer(m, trF as TrainerId));
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [db.members, q, trF]);

  function cntAtt(mid: string, prefix: string | null) {
    let total = 0;
    const today = new Date().toISOString().slice(0, 10);
    const range = prefix
      ? (() => {
          const [yy, mm] = prefix.split("-").map(Number);
          const dim = new Date(yy, mm, 0).getDate();
          return Array.from({ length: dim }, (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`);
        })()
      : null;

    const iterate = range
      ? range.filter((ds) => ds <= today)
      : // cumulative: iterate all dates present in sessions + fixedSchedules (limited by today)
        uniqueDatesForMember(db, mid).filter((ds) => ds <= today);

    for (const ds of iterate) {
      const sess = getSessionsForDate(db, ds).filter((s) => s.mid === mid);
      for (const s of sess) {
        const st = db.att[`${ds}_${s.id}`];
        if (st !== "precancel" && st !== "daycancel" && st !== "absent") total++;
      }
    }
    return total;
  }

  function lastVisit(mid: string) {
    const today = new Date().toISOString().slice(0, 10);
    const dates = uniqueDatesForMember(db, mid)
      .filter((ds) => ds <= today)
      .sort()
      .reverse();
    for (const ds of dates) {
      const sess = getSessionsForDate(db, ds).find((s) => s.mid === mid);
      if (!sess) continue;
      const st = db.att[`${ds}_${sess.id}`];
      if (st !== "precancel" && st !== "daycancel" && st !== "absent") {
        return ds.slice(5).replace("-", "/");
      }
    }
    return null;
  }

  return (
    <div>
      <div className="font-bebas text-[1.6rem] tracking-[2px] mb-3">
        회원 <em className="text-acc not-italic">관리</em>
      </div>
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 검색..."
          className="bg-sf border border-bd text-tx px-3 py-2 rounded-lg text-[0.84rem] flex-1 min-w-[120px] outline-none focus:border-acc"
        />
        <button
          onClick={() => setAdding(true)}
          className="px-3.5 py-2 rounded-lg bg-acc text-black font-bold text-[0.78rem] whitespace-nowrap"
        >
          + 추가
        </button>
        <button
          onClick={() => setBulkAdding(true)}
          className="px-3.5 py-2 rounded-lg bg-sf2 text-tx border border-bd font-bold text-[0.78rem] whitespace-nowrap hover:border-acc hover:text-acc"
        >
          📋 대량 추가
        </button>
      </div>
      <TrainerTabs value={trF} onChange={setTrF} />
      {!filtered.length ? (
        <div className="text-center py-12 text-mu">회원이 없습니다</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {filtered.map((m, i) => {
            const tids = memberTrainers(m);
            const mA = cntAtt(m.id, ym);
            const tA = cntAtt(m.id, null);
            const last = lastVisit(m.id);
            return (
              <div key={m.id} className="bg-sf border border-bd rounded-xl p-3.5">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-[0.92rem] text-black flex-shrink-0"
                    style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                  >
                    {m.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[0.87rem]">{m.name}</div>
                    <div className="text-[0.69rem] text-mu mt-0.5 flex flex-wrap gap-1 items-center">
                      {tids.length ? (
                        tids.map((id) => {
                          const t = getTrainer(id);
                          if (!t) return null;
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[0.64rem] font-bold"
                              style={{ color: t.hex, borderColor: t.hex + "55" }}
                            >
                              {t.name}
                            </span>
                          );
                        })
                      ) : (
                        <span>미배정</span>
                      )}
                      {m.phone && <span>· {m.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <div className="flex-1 bg-sf2 rounded-md p-1.5 text-center">
                    <div className="font-black text-[0.95rem] text-acc">{mA}</div>
                    <div className="text-[0.6rem] text-mu mt-0.5">이번달</div>
                  </div>
                  <div className="flex-1 bg-sf2 rounded-md p-1.5 text-center">
                    <div className="font-black text-[0.95rem] text-acc">{tA}</div>
                    <div className="text-[0.6rem] text-mu mt-0.5">누적</div>
                  </div>
                  <div className="flex-1 bg-sf2 rounded-md p-1.5 text-center">
                    <div className="font-black text-[0.7rem] text-tx">{last || "없음"}</div>
                    <div className="text-[0.6rem] text-mu mt-0.5">마지막 방문</div>
                  </div>
                </div>
                {m.memo?.trim() && (
                  <div className="mt-2 px-2 py-1.5 bg-[rgba(232,255,71,0.06)] border border-acc/30 rounded-md text-[0.72rem] text-tx whitespace-pre-wrap leading-relaxed">
                    💬 {m.memo}
                  </div>
                )}
                {(() => {
                  const log = (m.memoLog || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
                  if (!log.length) return null;
                  const latest = log[0];
                  return (
                    <div className="mt-2 px-2 py-1.5 bg-sf2 border border-bd rounded-md text-[0.72rem] text-tx">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-acc text-[0.68rem]">📋 {fmtKo(latest.date)}</span>
                        {log.length > 1 && (
                          <span className="text-[0.64rem] text-mu">+{log.length - 1}건 더</span>
                        )}
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed line-clamp-2">{latest.text}</div>
                    </div>
                  );
                })()}
                <div className="flex gap-1.5 mt-2.5">
                  <button
                    onClick={() => setScheduleFor(m)}
                    className="flex-1 py-2 rounded-lg bg-acc/10 text-acc border border-acc/40 font-bold text-[0.78rem]"
                  >
                    📅 예약 보기
                  </button>
                  <button
                    onClick={() => setEditing(m)}
                    className="flex-1 py-2 rounded-lg bg-sf2 text-tx border border-bd font-bold text-[0.78rem]"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm("삭제할까요?")) return;
                      mutate("회원 삭제", (d) => {
                        d.members = d.members.filter((x) => x.id !== m.id);
                        d.sessions = d.sessions.filter((s) => s.mid !== m.id);
                        d.fixedSchedules = d.fixedSchedules.filter((f) => f.mid !== m.id);
                      });
                    }}
                    className="flex-1 py-2 rounded-lg bg-transparent text-red border border-red font-bold text-[0.78rem]"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(adding || editing) && (
        <MemberModal
          member={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}

      {bulkAdding && <BulkAddModal onClose={() => setBulkAdding(false)} />}

      {scheduleFor && (
        <MemberScheduleModal
          member={scheduleFor}
          onClose={() => setScheduleFor(null)}
        />
      )}
    </div>
  );
}

function MemberModal({
  member,
  onClose,
}: {
  member: Member | null;
  onClose: () => void;
}) {
  const { db, mutate } = useStore();
  const [name, setName] = useState(member?.name || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [tids, setTids] = useState<TrainerId[]>(member ? memberTrainers(member) : []);
  const [memo, setMemo] = useState(member?.memo || "");
  const [memoLog, setMemoLog] = useState<MemberMemoEntry[]>(member?.memoLog || []);
  const todayISO = new Date().toISOString().slice(0, 10);
  const [logDate, setLogDate] = useState(todayISO);
  const [logText, setLogText] = useState("");

  function addLogEntry() {
    const text = logText.trim();
    if (!text) return;
    if (!logDate) return;
    const entry: MemberMemoEntry = {
      id: "ml" + Date.now(),
      date: logDate,
      text,
      createdAt: new Date().toISOString(),
    };
    setMemoLog((prev) => [entry, ...prev]);
    setLogText("");
    setLogDate(todayISO);
  }

  function removeLogEntry(id: string) {
    setMemoLog((prev) => prev.filter((e) => e.id !== id));
  }

  const sortedLog = [...memoLog].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });

  const duplicates = useMemo(() => {
    const n = name.trim();
    if (!n) return [];
    return db.members.filter(
      (m) => m.id !== member?.id && m.name.trim() === n
    );
  }, [db.members, name, member?.id]);

  function toggleTid(id: TrainerId) {
    setTids((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function save() {
    if (!name.trim()) return alert("이름을 입력해주세요");
    if (!tids.length) return alert("담당 트레이너를 최소 1명 선택해주세요");
    if (member) {
      mutate("회원 수정", (d) => {
        const m = d.members.find((x) => x.id === member.id);
        if (m) {
          m.name = name.trim();
          m.phone = phone;
          m.tid = tids[0];
          m.tids = tids;
          m.memo = memo.trim();
          m.memoLog = memoLog;
        }
      });
    } else {
      mutate("회원 추가", (d) => {
        d.members.push({
          id: "m" + Date.now(),
          name: name.trim(),
          phone,
          tid: tids[0],
          tids,
          memo: memo.trim(),
          memoLog,
        });
      });
    }
    onClose();
  }

  return (
    <Modal title={member ? "회원 수정" : "회원 추가"} onClose={onClose}>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
        />
        {duplicates.length > 0 && (
          <div className="mt-1.5 px-2.5 py-2 rounded-md border border-orange/60 bg-[rgba(255,170,0,0.08)]">
            <div className="text-[0.72rem] font-bold text-orange mb-1">
              ⚠️ 같은 이름의 회원 {duplicates.length}명
            </div>
            <div className="flex flex-col gap-0.5">
              {duplicates.map((d) => (
                <div key={d.id} className="text-[0.74rem] text-tx flex flex-wrap gap-1.5 items-center">
                  <span className="font-bold">{d.name}</span>
                  {memberTrainers(d).map((id) => {
                    const t = getTrainer(id);
                    return t ? (
                      <span key={id} style={{ color: t.hex }} className="text-[0.7rem]">
                        {t.name}
                      </span>
                    ) : null;
                  })}
                  {d.phone && <span className="text-[0.7rem] text-mu">{d.phone}</span>}
                </div>
              ))}
            </div>
            <div className="text-[0.7rem] text-mu mt-1">
              동명이인이면 그대로 추가해도 됩니다.
            </div>
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">연락처</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="010-0000-0000"
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
        />
      </div>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">담당 트레이너 (여러 명 선택 가능)</label>
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
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">
          회원 메모 <span className="text-[0.68rem] opacity-70">(부상 · 선호 · 주의사항 등)</span>
        </label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="예: 무릎 수술 이력, 스쿼트 주의"
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem] outline-none focus:border-acc resize-none"
        />
      </div>
      <div className="mb-3">
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">
          일자별 이슈 기록 <span className="text-[0.68rem] opacity-70">(그날 중요한 이슈 · 컨디션 · 특이사항)</span>
        </label>
        <div className="flex gap-1.5 mb-2">
          <input
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className="bg-sf2 border border-bd text-tx px-2 py-2 rounded-lg text-[0.8rem] outline-none focus:border-acc"
          />
          <input
            value={logText}
            onChange={(e) => setLogText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addLogEntry();
              }
            }}
            placeholder="예: 오른쪽 어깨 통증 호소"
            className="flex-1 min-w-0 bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem] outline-none focus:border-acc"
          />
          <button
            type="button"
            onClick={addLogEntry}
            disabled={!logText.trim() || !logDate}
            className="px-3 py-2 rounded-lg bg-acc text-black font-bold text-[0.78rem] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            추가
          </button>
        </div>
        {sortedLog.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-[240px] overflow-y-auto pr-0.5">
            {sortedLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-2 px-2 py-1.5 bg-sf2 border border-bd rounded-md"
              >
                <div className="flex flex-col items-start min-w-[72px]">
                  <span className="text-[0.68rem] font-bold text-acc">{fmtKo(entry.date)}</span>
                </div>
                <div className="flex-1 text-[0.78rem] text-tx whitespace-pre-wrap leading-relaxed break-words">
                  {entry.text}
                </div>
                <button
                  type="button"
                  onClick={() => removeLogEntry(entry.id)}
                  className="text-mu hover:text-red text-[0.75rem] px-1.5 py-0.5 flex-shrink-0"
                  aria-label="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3.5">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-sf2 text-tx font-bold text-[0.83rem] border-none">
          취소
        </button>
        <button onClick={save} className="flex-1 py-2.5 rounded-lg bg-acc text-black font-bold text-[0.83rem] border-none">
          저장
        </button>
      </div>
    </Modal>
  );
}
