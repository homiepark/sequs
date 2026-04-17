"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  AVATAR_COLORS,
  TRAINERS,
  getTrainer,
  type Member,
  type TrainerId,
} from "@/lib/types";
import { TrainerTabs } from "../ui/TrainerTabs";
import { Modal } from "../ui/Modal";

export function MembersPage() {
  const { db, mutate } = useStore();
  const [q, setQ] = useState("");
  const [trF, setTrF] = useState("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);

  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const filtered = useMemo(() => {
    let list = db.members.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
    if (trF !== "all") list = list.filter((m) => m.tid === trF);
    return list;
  }, [db.members, q, trF]);

  function cntAtt(mid: string, prefix: string | null) {
    return Object.entries(db.att).filter(([k, v]) => {
      if (v !== "present") return false;
      const [date, sid] = k.split("_");
      if (prefix && !date.startsWith(prefix)) return false;
      const s = db.sessions.find((x) => x.id === sid);
      if (s) return s.mid === mid;
      const fidMatch = k.match(/^[^_]+_fx_([^_]+)_/);
      if (fidMatch) {
        const f = db.fixedSchedules.find((x) => x.id === fidMatch[1]);
        return f && f.mid === mid;
      }
      return false;
    }).length;
  }

  function lastVisit(mid: string) {
    const dates = Object.entries(db.att)
      .filter(([k, v]) => {
        if (v !== "present") return false;
        const sid = k.split("_")[1];
        const s = db.sessions.find((x) => x.id === sid);
        return s && s.mid === mid;
      })
      .map(([k]) => k.split("_")[0])
      .sort()
      .reverse();
    return dates[0] ? dates[0].slice(5).replace("-", "/") : null;
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
      </div>
      <TrainerTabs value={trF} onChange={setTrF} />
      {!filtered.length ? (
        <div className="text-center py-12 text-mu">회원이 없습니다</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}>
          {filtered.map((m, i) => {
            const t = getTrainer(m.tid);
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
                  <div>
                    <div className="font-bold text-[0.87rem]">{m.name}</div>
                    <div className="text-[0.69rem] text-mu mt-0.5">
                      {t ? (
                        <span style={{ color: t.hex }}>{t.name}</span>
                      ) : (
                        " 미배정"
                      )}
                      {m.phone && " · " + m.phone}
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
                <div className="flex gap-1.5 mt-2.5">
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
  const { mutate } = useStore();
  const [name, setName] = useState(member?.name || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [tid, setTid] = useState<TrainerId>((member?.tid || "t1") as TrainerId);

  function save() {
    if (!name.trim()) return alert("이름을 입력해주세요");
    if (member) {
      mutate("회원 수정", (d) => {
        const m = d.members.find((x) => x.id === member.id);
        if (m) {
          m.name = name.trim();
          m.phone = phone;
          m.tid = tid;
        }
      });
    } else {
      mutate("회원 추가", (d) => {
        d.members.push({ id: "m" + Date.now(), name: name.trim(), phone, tid });
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
        <label className="block text-[0.71rem] text-mu mb-1 font-medium">담당 트레이너</label>
        <select
          value={tid}
          onChange={(e) => setTid(e.target.value as TrainerId)}
          className="w-full bg-sf2 border border-bd text-tx px-2.5 py-2 rounded-lg text-[0.84rem]"
        >
          {TRAINERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
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
