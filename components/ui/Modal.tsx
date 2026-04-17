"use client";
import { useEffect } from "react";

export function Modal({
  title,
  wide,
  children,
  onClose,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/75 z-[400] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-sf border border-bd rounded-[15px] p-5.5 w-full anim-fade-up ${
          wide ? "max-w-[430px]" : "max-w-[370px]"
        }`}
        style={{ padding: "22px" }}
      >
        <h3 className="font-bebas text-[1.3rem] tracking-wider mb-4 text-acc">{title}</h3>
        {children}
      </div>
    </div>
  );
}
