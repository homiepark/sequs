"use client";
import { useMemo, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import {
  SALARY_CONFIGS,
  SALARY_EXCLUDED,
  TRAINERS,
  getMember,
  getSessionsForDate,
  getTrainer,
  type Session,
  type TrainerId,
} from "@/lib/types";
import { TrainerTabs } from "../ui/TrainerTabs";

export function StatsPage() {
  const { db, exportJSON, importJSON } = useStore();
  const now = new Date();
  const [yr, setYr] = useState(now.getFullYear());
  const [mo, setMo] = useState(now.getMonth() + 1);
  const [trF, setTrF] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { present, absent, precan, daycan } = useMemo(() => {
    const prefix = `${yr}-${String(mo).padStart(2, "0")}`;
    const dim = new Date(yr, mo, 0).getDate();
    const today = new Date().toISOString().slice(0, 10);
    const all: Session[] = [];
    for (let d = 1; d <= dim; d++) {
      const ds = `${prefix}-${String(d).padStart(2, "0")}`;
      if (ds > today) break;
      getSessionsForDate(db, ds).forEach((s) => all.push(s));
    }
    const f = trF ? all.filter((s) => s.tid === trF) : all;
    return {
      present: f.filter((s) => {
        const st = db.att[`${s.date}_${s.id}`];
        return st !== "precancel" && st !== "daycancel" && st !== "absent";
      }),
      absent: f.filter((s) => db.att[`${s.date}_${s.id}`] === "absent"),
      precan: f.filter((s) => db.att[`${s.date}_${s.id}`] === "precancel"),
      daycan: f.filter((s) => db.att[`${s.date}_${s.id}`] === "daycancel"),
    };
  }, [db, yr, mo, trF]);

  const trainersToShow = trF ? TRAINERS.filter((t) => t.id === trF) : TRAINERS;

  function doExport() {
    const text = exportJSON();
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seqmv-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("현재 데이터를 가져올 파일로 덮어씁니다. 계속할까요?")) {
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJSON(String(reader.result || ""));
      alert(ok ? "가져오기 완료" : "가져오기 실패 — 파일 형식을 확인해주세요");
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  }

  function copyTbl(
    rows: [string, { count: number; isGuest: boolean; name: string }][],
    notifyId: string
  ) {
    let text = "#\t회원\t출석 횟수\n";
    rows.forEach(([, v], i) => {
      const label = v.isGuest ? `미등록 · ${v.name}` : v.name;
      text += `${i + 1}\t${label}\t${v.count}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      const n = document.getElementById(notifyId);
      if (n) {
        n.style.display = "inline";
        setTimeout(() => (n.style.display = "none"), 2000);
      }
    });
  }

  return (
    <div>
      <div className="font-bebas text-[1.6rem] tracking-[2px] mb-3">
        월별 <em className="text-acc not-italic">통계</em>
      </div>
      <div className="flex gap-2 mb-3.5 items-center flex-wrap">
        <select value={yr} onChange={(e) => setYr(parseInt(e.target.value))} className="bg-sf border border-bd text-tx px-2.5 py-1.5 rounded-lg text-[0.8rem] outline-none">
          {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
        <select value={mo} onChange={(e) => setMo(parseInt(e.target.value))} className="bg-sf border border-bd text-tx px-2.5 py-1.5 rounded-lg text-[0.8rem] outline-none">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}월</option>
          ))}
        </select>
        <div className="flex gap-1.5 ml-auto">
          <button onClick={doExport} className="bg-sf2 border border-bd text-tx px-3 py-1.5 rounded-lg text-[0.78rem] font-bold hover:border-acc hover:text-acc">
            📥 내보내기
          </button>
          <button onClick={() => fileRef.current?.click()} className="bg-sf2 border border-bd text-tx px-3 py-1.5 rounded-lg text-[0.78rem] font-bold hover:border-acc hover:text-acc">
            📤 가져오기
          </button>
          <input ref={fileRef} type="file" accept="application/json" onChange={onImport} className="hidden" />
        </div>
      </div>

      <TrainerTabs value={trF || "all"} onChange={(v) => setTrF(v === "all" ? "" : v)} />

      <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
        <KPI label="출석" value={present.length} color="text-acc" />
        <KPI label="결석" value={absent.length} color="text-acc2" />
        <KPI label="사전캔슬" value={precan.length} color="text-t2" />
        <KPI label="당일캔슬" value={daycan.length} color="text-acc2" />
      </div>

      <SalarySection yr={yr} mo={mo} present={present} trF={trF} />

      <div>
        {trainersToShow.map((t) => {
          const tp = present.filter((s) => s.tid === t.id);
          const mc: Record<string, { count: number; isGuest: boolean; name: string }> = {};
          tp.forEach((s) => {
            if (s.mid) {
              const m = getMember(db, s.mid);
              const key = s.mid;
              if (!mc[key]) mc[key] = { count: 0, isGuest: false, name: m?.name || "?" };
              mc[key].count++;
            } else {
              const key = "guest_" + (s.customName || "?");
              if (!mc[key]) mc[key] = { count: 0, isGuest: true, name: s.customName || "?" };
              mc[key].count++;
            }
          });
          const sorted = Object.entries(mc).sort((a, b) => b[1].count - a[1].count);
          const nid = `notify_${t.id}`;
          return (
            <div key={t.id} className="bg-sf border rounded-xl p-4 mb-3.5" style={{ borderColor: t.hex + "30" }}>
              <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                <div className="font-bold text-[0.82rem] tracking-widest uppercase" style={{ color: t.hex }}>
                  {t.name} — {tp.length}회
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyTbl(sorted, nid)} className="bg-acc text-black px-3 py-1.5 rounded-lg text-[0.78rem] font-bold">
                    📋 복사
                  </button>
                  <span id={nid} style={{ display: "none" }} className="text-[0.74rem] text-green">
                    ✓ 복사됨
                  </span>
                </div>
              </div>
              {!sorted.length ? (
                <div className="text-mu text-[0.8rem]">이달 출석 기록 없음</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-bd">
                  <table className="w-full border-collapse" style={{ minWidth: 380 }}>
                    <thead>
                      <tr className="bg-sf2">
                        <th className="px-3 py-2 text-left text-[0.72rem] text-mu font-bold border-b border-bd">#</th>
                        <th className="px-3 py-2 text-left text-[0.72rem] text-mu font-bold border-b border-bd">회원</th>
                        <th className="px-3 py-2 text-left text-[0.72rem] text-mu font-bold border-b border-bd">출석 횟수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map(([k, v], i) => {
                        const rankColor =
                          i === 0 ? "text-[#ffd700]" : i === 1 ? "text-[#c0c0c0]" : i === 2 ? "text-[#cd7f32]" : "text-mu";
                        return (
                          <tr key={k + i}>
                            <td className="px-3 py-2 text-[0.8rem] border-b border-bd">
                              <span className={`font-bebas text-[0.95rem] ${rankColor}`}>{i + 1}</span>
                            </td>
                            <td className="px-3 py-2 text-[0.8rem] border-b border-bd font-bold">
                              {v.isGuest && (
                                <span className="text-[0.66rem] text-mu mr-1.5 font-medium">미등록 ·</span>
                              )}
                              {v.name}
                            </td>
                            <td className="px-3 py-2 text-[0.8rem] border-b border-bd">{v.count}회</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function won(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

function SalarySection({
  yr,
  mo,
  present,
  trF,
}: {
  yr: number;
  mo: number;
  present: Session[];
  trF: string;
}) {
  const { db, mutate } = useStore();
  const targets = TRAINERS.filter((t) => (trF ? t.id === trF : true));
  const hasAny = targets.some((t) => SALARY_CONFIGS[t.id] || SALARY_EXCLUDED[t.id]);
  if (!hasAny) return null;

  const monthKey = `${yr}-${String(mo).padStart(2, "0")}`;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-[0.9rem] md:text-[1.05rem]">💰 급여 정산</span>
        <span className="text-[0.72rem] text-mu">{monthKey}</span>
      </div>
      <div className="flex flex-col gap-3">
        {targets.map((t) => {
          const excluded = SALARY_EXCLUDED[t.id];
          if (excluded) {
            const sessions = present.filter((s) => s.tid === t.id).length;
            return (
              <div key={t.id} className="bg-sf border rounded-xl p-4" style={{ borderColor: t.hex + "55" }}>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.hex }} />
                  <span className="font-bold text-[0.95rem] md:text-[1.1rem]" style={{ color: t.hex }}>
                    {t.name}
                  </span>
                  <span className="text-[0.76rem] text-mu">수업 {sessions}회</span>
                </div>
                <div className="text-[0.8rem] text-mu">{excluded}</div>
              </div>
            );
          }

          const cfgMaybe = SALARY_CONFIGS[t.id];
          if (!cfgMaybe) return null;
          const cfg = cfgMaybe;

          const tid = t.id;
          const sessions = present.filter((s) => s.tid === tid).length;
          const key = `${monthKey}_${tid}`;
          const extras = (db.monthlyExtras || {})[key] || {};
          const volansCount = extras.volansCount || 0;

          const sessionFee = sessions * cfg.sessionPrice;
          const afterDeduction = cfg.laborIncome - cfg.insurance - cfg.retirement;
          const volansSales = volansCount * cfg.volansPrice;
          const businessIncome = sessionFee - cfg.laborIncome + volansSales;
          const whRate = cfg.withholdingRate ?? 0.033;
          const withholdingTax = cfg.deductWithholding ? Math.round(businessIncome * whRate) : 0;
          const businessAfterTax = cfg.deductWithholding ? businessIncome - withholdingTax : businessIncome;
          const total = afterDeduction + businessAfterTax;

          function setVolans(n: number) {
            mutate("볼란스 수 변경", (d) => {
              d.monthlyExtras = d.monthlyExtras || {};
              d.monthlyExtras[key] = { ...(d.monthlyExtras[key] || {}), volansCount: n };
            });
          }

          function copy() {
            const lines = [
              `${t.name} · ${monthKey}`,
              `수업수\t${sessions}`,
              `수업 단가\t${cfg.sessionPrice}`,
              `세션료\t${sessionFee}`,
              `근로소득\t${cfg.laborIncome}`,
              `4대보험\t${cfg.insurance}`,
              `퇴직금\t${cfg.retirement}`,
              `공제 후\t${afterDeduction}`,
              `볼란스 수\t${volansCount}`,
              `볼란스 매출\t${volansSales}`,
              `사업소득\t${businessIncome}`,
            ];
            if (cfg.deductWithholding) {
              lines.push(`원천세 ${(whRate * 100).toFixed(1)}%\t${withholdingTax}`);
              lines.push(`신고소득 공제 후\t${businessAfterTax}`);
            } else {
              lines.push(`세금계산서 발행\t${businessIncome}`);
            }
            lines.push(`총급여\t${total}`);
            navigator.clipboard.writeText(lines.join("\n"));
          }

          return (
            <div key={tid} className="bg-sf border rounded-xl p-4" style={{ borderColor: t.hex + "55" }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.hex }} />
                  <span className="font-bold text-[0.95rem] md:text-[1.1rem]" style={{ color: t.hex }}>
                    {t.name}
                  </span>
                  <span className="text-[0.76rem] text-mu">수업 {sessions}회</span>
                </div>
                <button
                  onClick={copy}
                  className="bg-sf2 border border-bd text-tx hover:border-acc hover:text-acc px-2.5 py-1 rounded-md text-[0.74rem] font-bold"
                >
                  📋 엑셀 복사
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <Stat label={`수업료 (${won(cfg.sessionPrice)} × ${sessions})`} value={won(sessionFee)} />
                <Stat label="근로소득" value={won(cfg.laborIncome)} muted />
                <Stat label="4대보험" value={`− ${won(cfg.insurance)}`} muted />
                <Stat label="퇴직금" value={`− ${won(cfg.retirement)}`} muted />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 items-end">
                <div className="bg-sf2 rounded-lg px-3 py-2">
                  <div className="text-[0.68rem] text-mu mb-0.5">볼란스 판매</div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      value={volansCount}
                      onChange={(e) => setVolans(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-14 bg-sf border border-bd text-tx px-1.5 py-1 rounded text-[0.86rem] font-bold text-center"
                    />
                    <span className="text-[0.74rem] text-mu">× {won(cfg.volansPrice)}</span>
                  </div>
                  <div className="text-[0.78rem] font-bold text-tx mt-0.5">
                    = {won(volansSales)}
                  </div>
                </div>
                <Stat label="공제 후 (근로)" value={won(afterDeduction)} />
              </div>

              <div className="bg-sf2 rounded-lg px-3 py-2.5 mb-2">
                <div className="text-[0.7rem] text-mu mb-1">
                  사업소득 = 세션료 − 근로소득 + 볼란스 매출
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-tx">사업소득</span>
                  <span className="font-bebas text-[1.3rem] text-orange">
                    {won(businessIncome)}
                  </span>
                </div>
                {cfg.deductWithholding ? (
                  <>
                    <div className="flex items-center justify-between mt-2 text-[0.78rem]">
                      <span className="text-mu">원천세 {(whRate * 100).toFixed(1)}% 차감</span>
                      <span className="text-red">− {won(withholdingTax)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-bd">
                      <span className="font-bold text-tx text-[0.82rem]">신고소득 공제 후</span>
                      <span className="font-bebas text-[1.15rem] text-tx">{won(businessAfterTax)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-[0.7rem] text-mu mt-1">
                    ↳ 세금계산서 발행 금액 (전액 수령)
                  </div>
                )}
              </div>

              <div className="bg-acc/10 border border-acc/40 rounded-lg px-3 py-3 flex items-center justify-between">
                <span className="font-bold text-acc">총 급여</span>
                <span className="font-bebas text-[1.6rem] tracking-wider text-acc">
                  {won(total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="bg-sf2 rounded-lg px-3 py-2">
      <div className="text-[0.68rem] text-mu mb-0.5">{label}</div>
      <div className={`font-bold ${muted ? "text-mu text-[0.8rem]" : "text-tx text-[0.88rem]"}`}>
        {value}
      </div>
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-sf border border-bd rounded-xl p-3.5">
      <div className="text-[0.7rem] text-mu mb-1">{label}</div>
      <div className={`font-bebas text-[1.8rem] tracking-wider ${color}`}>{value}</div>
    </div>
  );
}
