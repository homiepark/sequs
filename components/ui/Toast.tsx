"use client";
export function Toast({ text }: { text: string }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] bg-sf border border-bd text-tx px-4 py-2.5 rounded-full text-[0.82rem] font-semibold shadow-lg anim-fade-up">
      {text}
    </div>
  );
}
