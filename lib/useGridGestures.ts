"use client";
import { useEffect, useRef, useState } from "react";

export interface GridGestureOptions {
  onSwipe?: (dir: -1 | 1) => void;
  minZoom?: number;
  maxZoom?: number;
}

export function useGridGestures(
  ref: React.RefObject<HTMLElement | null>,
  opts: GridGestureOptions = {}
) {
  const { onSwipe, minZoom = 0.55, maxZoom = 1.6 } = opts;
  const [zoom, setZoom] = useState(1);
  const startDist = useRef(0);
  const startZoom = useRef(1);
  const pinching = useRef(false);
  const lastTap = useRef(0);
  const swipeStart = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
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

      // Double-tap reset zoom
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        const now = Date.now();
        if (now - lastTap.current < 280) {
          setZoom(1);
        }
        lastTap.current = now;
      }

      // Swipe detection (horizontal)
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

    el.addEventListener("touchstart", onStart, { passive: false });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [ref, onSwipe, zoom, minZoom, maxZoom]);

  return { zoom, setZoom };
}
