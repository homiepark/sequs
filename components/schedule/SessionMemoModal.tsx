"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  fmtKo,
  getMember,
  getTrainer,
  sessionSlotKey,
  type MemberMemoEntry,
  type Session,
  type TrainerId,
} from "@/lib/types";
import { Modal } from "../ui/Modal";

export function SessionMemoModal({
  date,
  time,
  tid,
  sess,
  onClose,
}: {
  date: string;
  time: string;
  tid: TrainerId;
  sess: Session | null;
  onClose: () => void;
}) {
  const { db, mutate } = useStore();
  const keyTime = sess?.time || time;
  const key = sessionSlotKey(date, tid, keyTime);
  const legacyKey = sessionSlotKey(date, tid, time);
  const existing =
    (db.sessionMemos || {})[key] || (db.sessionMemos || {})[legacyKey] || "";
  const [text, setText] = useState(existing);

  const t = getTrainer(tid);
  const mem = sess?.mid ? getMember(db, sess.mid) : null;
  const memberName = mem?.name || sess?.customName || null;
  const initialProfileMemo = mem?.memo || "";
  const [profileMemo, setProfileMemo] = useState(initialProfileMemo);

  // 회원 이슈 (memoLog) 상태
  const [issueDate, setIssueDate] = useState(date);
  const [issueText, setIssueText] = useState("");
  const [expanded, setExpanded] = useState(false);

  const memberLatest = useMemo(() => {
    if (!mem) return null;
    return db.members.find((x) => x.id === mem.id) || null;
  }, [db.members, mem]);

  const sortedIssues = useMemo(() => {
    const log = memberLatest?.memoLog || [];
    return [...log].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });
  }, [memberLatest]);

  const visibleIssues = expanded ? sortedIssues : sortedIssues.slice(0, 3);
  const hiddenCount = sortedIssues.length - visibleIssues.length;

  function addIssue() {
    if (!mem) return;
    const trimmed = issueText.trim();
    if (!trimmed || !issueDate) return;
    const entry: MemberMemoEntry = {
      id: "ml" + Date.now(),
      date: issueDate,
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    mutate("회원 이슈 추가", (d) => {
      const target = d.members.find((x) => x.id === mem.id);
      if (!target) return;
      target.memoLog = [entry, ...(target.memoLog || [])];
    });
    setIssueText("");
    setIssueDate(date);
  }

  function deleteIssue(id: string) {
    if (!mem) return;
    mutate("회원 이슈 삭제", (d) => {
      const target = d.members.find((x) => x.id === mem.id);
      if (!target || !target.memoLog) return;
      target.memoLog = target.memoLog.filter((e) => e.id !== id);
    });
  }

  function save() {
    const trimmed = text.trim();
    const trimmedProfile = profileMemo.trim();
    const profileChanged = mem && trimmedProfile !== (mem.memo || "").trim();
    const sessionChanged = trimmed !== existing.trim();

    if (sessionChanged || profileChanged) {
      const label = sessionChanged && profileChanged
        ? "수업 메모 · 특이사항 저장"
        : profileChanged
        ? "회원 특이사항 저장"
        : trimmed
        ? "수업 메모 저장"
        : "수업 메모 삭제";
      mutate(label, (d) => {
        if (sessionChanged) {
          d.sessionMemos = d.sessionMemos || {};
          if (legacyKey !== key) delete d.sessionMemos[legacyKey];
          if (!trimmed) delete d.sessionMemos[key];
          else d.sessionMemos[key] = trimmed;
        }
        if (profileChanged && mem) {
          const target = d.members.find((x) => x.id === mem.id);
          if (target) target.memo = trimmedProfile;
        }
      });
    }
    onClose();
  }

  function removeSessionMemo() {
    mutate("수업 메모 삭제", (d) => {
      if (d.sessionMemos) {
        delete d.sessionMemos[key];
        if (legacyKey !== key) delete d.sessionMemos[legacyKey];
      }
    });
    setText("");
  }

  return (
    <Modal title="수업 메모 · 회원 이슈" onClose={onClose}>
      <div className="mb-3 px-3 py-2 bg-sf2 rounded-lg">
        <div className="font-bebas text-[1.1rem] tracking-wider" style={{ color: t?.hex }}>
          {time}
        </div>
        <div className="text-[0.85rem] font-bold mt-0.5">
          {memberName || "빈 슬롯"}
        </div>
        <div className="text-[0.7rem] text-mu mt-0.5">
          {date} · {t?.name}
        </div>
      </div>

      {mem && (
        <div className="mb-3">
          <label className="block text-[0.72rem] text-mu mb-1 font-semibold">
            💬 회원 특이사항 <span className="text-[0.66rem] opacity-70">(부상 · 선호 · 주의사항 등 · 항시 표시)</span>
          </label>
          <textarea
            value={profileMemo}
            onChange={(e) => setProfileMemo(e.target.value)}
            rows={2}
            placeholder="예: 무릎 수술 이력, 스쿼트 주의"
            className="w-full bg-[rgba(232,255,71,0.06)] border border-acc/30 text-tx px-2.5 py-2 rounded-lg text-[0.84rem] outline-none focus:border-acc resize-none leading-relaxed"
          />
        </div>
      )}

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[0.72rem] text-mu font-semibold">
            📝 수업 메모 <span className="text-[0.66rem] opacity-70">(이 수업 한 번)</span>
          </label>
          {existing && (
            <button
              type="button"
              onClick={removeSessionMemo}
              className="text-[0.68rem] text-red hover:underline"
            >
              지우기
            </button>
          )}
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="예: 이날 사정있으면 알려달라고 함 / 여행으로 다음주 불참 예정"
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.86rem] outline-none focus:border-acc resize-none"
        />
      </div>

      {mem && (
        <div className="mb-2 pt-3 border-t border-bd">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[0.72rem] text-mu font-semibold">
              📋 회원 이슈 <span className="text-[0.66rem] opacity-70">(일자별 누적 기록 · 즉시 저장)</span>
            </label>
            {sortedIssues.length > 0 && (
              <span className="text-[0.66rem] text-mu">총 {sortedIssues.length}건</span>
            )}
          </div>
          <div className="flex gap-1.5 mb-2">
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="bg-sf2 border border-bd text-tx px-2 py-2 rounded-lg text-[0.78rem] outline-none focus:border-acc"
            />
            <input
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  addIssue();
                }
              }}
              placeholder="예: 오른쪽 어깨 통증 호소"
              className="flex-1 min-w-0 bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem] outline-none focus:border-acc"
            />
            <button
              type="button"
              onClick={addIssue}
              disabled={!issueText.trim() || !issueDate}
              className="px-3 py-2 rounded-lg bg-acc text-black font-bold text-[0.78rem] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              추가
            </button>
          </div>
          {sortedIssues.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {visibleIssues.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 px-2 py-1.5 bg-sf2 border border-bd rounded-md"
                >
                  <span className="text-[0.68rem] font-bold text-acc min-w-[72px] pt-0.5">
                    {fmtKo(entry.date)}
                  </span>
                  <div className="flex-1 text-[0.78rem] text-tx whitespace-pre-wrap leading-relaxed break-words">
                    {entry.text}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteIssue(entry.id)}
                    className="text-mu hover:text-red text-[0.72rem] px-1 py-0.5 flex-shrink-0"
                    aria-label="삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {hiddenCount > 0 && !expanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="py-1.5 rounded-md bg-transparent border border-bd text-[0.74rem] text-mu hover:text-acc hover:border-acc"
                >
                  + {hiddenCount}건 더 보기
                </button>
              )}
              {expanded && sortedIssues.length > 3 && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="py-1.5 rounded-md bg-transparent border border-bd text-[0.74rem] text-mu hover:text-acc hover:border-acc"
                >
                  접기
                </button>
              )}
            </div>
          ) : (
            <div className="text-[0.74rem] text-mu text-center py-3 bg-sf2 rounded-md border border-bd border-dashed">
              아직 기록된 이슈가 없습니다
            </div>
          )}
        </div>
      )}

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
