"use client";
import { TRAINERS } from "@/lib/types";

export function TrainerTabs({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 mb-3 flex-wrap">
      <TabButton active={value === "all"} onClick={() => onChange("all")}>
        <span className="w-[7px] h-[7px] rounded-full bg-acc" />
        전체
      </TabButton>
      {TRAINERS.map((t) => (
        <TabButton
          key={t.id}
          active={value === t.id}
          hex={t.hex}
          onClick={() => onChange(t.id)}
        >
          <span className="w-[7px] h-[7px] rounded-full" style={{ background: t.hex }} />
          {t.name}
        </TabButton>
      ))}
    </div>
  );
}

function TabButton({
  active,
  hex,
  onClick,
  children,
}: {
  active: boolean;
  hex?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const style =
    active && hex
      ? { background: hex, borderColor: hex, color: "#000" }
      : active && !hex
      ? { background: "var(--acc)", borderColor: "var(--acc)", color: "#000" }
      : undefined;
  return (
    <button
      onClick={onClick}
      style={style}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] border-2 border-bd bg-transparent text-mu cursor-pointer text-[0.82rem] font-bold ${
        active ? "" : ""
      }`}
    >
      {children}
    </button>
  );
}
