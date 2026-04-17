"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setStandalone(isStandalone);
    setIsIOSDevice(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => setStandalone(true);
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (standalone) return null;
  if (!deferred && !isIOSDevice) return null;

  async function click() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setDeferred(null);
      return;
    }
    if (isIOSDevice) setShowIOS(true);
  }

  return (
    <>
      <button
        onClick={click}
        title="홈 화면에 추가"
        className="bg-acc/20 border border-acc/50 text-acc px-2.5 py-1.5 rounded-[7px] text-[0.72rem] font-bold flex-shrink-0 hover:bg-acc/30 whitespace-nowrap"
      >
        📲 설치
      </button>
      {showIOS && <IOSInstructions onClose={() => setShowIOS(false)} />}
    </>
  );
}

function IOSInstructions({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 z-[700]"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-[710] bg-sf rounded-t-[18px] border-t border-bd pt-4 animate-in anim-fade-up"
           style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
        <div className="w-9 h-1 bg-bd rounded-sm mx-auto mb-4" />
        <div className="px-5 pb-2">
          <div className="font-bebas text-[1.35rem] tracking-wider text-acc mb-1">
            홈 화면에 추가
          </div>
          <div className="text-[0.82rem] text-mu leading-relaxed mb-4">
            iOS Safari는 직접 추가해야 해요.<br />
            Safari로 접속했는지 확인하고 아래 순서대로 해주세요.
          </div>

          <Step num={1}>
            Safari 하단의 <span className="text-acc font-bold">공유 버튼</span>
            <span className="inline-block mx-1 px-1.5 py-0.5 rounded border border-bd text-[0.75rem]">􀈂</span>
            탭
          </Step>
          <Step num={2}>
            <span className="text-acc font-bold">&quot;홈 화면에 추가&quot;</span>
            <span className="inline-block mx-1 px-1.5 py-0.5 rounded border border-bd text-[0.75rem]">➕</span>
            선택
          </Step>
          <Step num={3}>
            오른쪽 상단 <span className="text-acc font-bold">&quot;추가&quot;</span> 눌러 완료
          </Step>
        </div>
        <button
          onClick={onClose}
          className="mt-4 mx-5 mb-1 py-2.5 w-[calc(100%-40px)] rounded-lg bg-sf2 text-tx font-bold text-[0.9rem]"
        >
          확인
        </button>
      </div>
    </>
  );
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-acc text-black font-bold text-[0.82rem] flex items-center justify-center">
        {num}
      </div>
      <div className="text-[0.88rem] text-tx leading-relaxed pt-0.5">{children}</div>
    </div>
  );
}
