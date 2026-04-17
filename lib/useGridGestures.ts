"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface GridGestureOptions {
  onSwipe?: (dir: -1 | 1) => void;
  minZoom?: number;
  maxZoom?: number;
}

export function useGridGestures(opts: GridGestureOptions = {}) {
  const { onSwipe, minZoom = 0.55, maxZoom = 1.6 } = opts;
  const [zoom, setZoom] = useState(1);
  const [el, setEl] = useState<HTMLElement | null>(null);
  const startDist = useRef(0);
  const startZoom = useRef(1);
  const pinching = useRef(false);
  const lastTap = useRef(0);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    setEl(node);
  }, []);

  useEffect(() => {
    if (!el) return;

    function dist(e: TouchEvent) {
      return Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }

    function onStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinching.current = true;
        startDist.current = dist(e);
        startZoom.current = zoom;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        swipeStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          t: Date.now(),
        };
      }
    }

    function onMove(e: TouchEvent) {
      if (pinching.current && e.touches.length === 2) {
        e.preventDefault();
        const ratio = dist(e) / startDist.current;
        const next = Math.max(minZoom, Math.min(maxZoom, startZoom.current * ratio));
        setZoom(next);
      }
    }

    function onEnd(e: TouchEvent) {
      if (e.touches.length < 2) pinching.current = false;

      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        const now = Date.now();
        if (now - lastTap.current < 280) {
          setZoom(1);
        }
        lastTap.current = now;
      }

      if (onSwipe && !pinching.current && swipeStart.current && e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - swipeStart.current.x;
        const dy = e.changedTouches[0].clientY - swipeStart.current.y;
        const dt = Date.now() - swipeStart.current.t;
        if (
          Math.abs(dx) > 80 &&
          Math.abs(dx) > Math.abs(dy) * 1.8 &&
          dt < 500
        ) {
          onSwipe(dx > 0 ? -1 : 1);
        }
      }
      swipeStart.current = null;
    }

    const targetEl = el;
    targetEl.addEventListener("touchstart", onStart, { passive: false });
    targetEl.addEventListener("touchmove", onMove, { passive: false });
    targetEl.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      targetEl.removeEventListener("touchstart", onStart);
      targetEl.removeEventListener("touchmove", onMove);
      targetEl.removeEventListener("touchend", onEnd);
    };
  }, [el, onSwipe, zoom, minZoom, maxZoom]);

  return { ref: setRef, zoom, setZoom };
}
