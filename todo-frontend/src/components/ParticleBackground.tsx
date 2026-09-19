import { lazy, memo, Suspense, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";

const ParticleBackgroundImpl = lazy(() => import("./ParticleBackgroundImpl"));

/**
 * Decorative particles. Skipped on mobile (canvas + modal blur janks).
 * On desktop the chunk waits until after first paint.
 */
function ParticleBackgroundWrapper() {
  const isMobile = useIsMobile();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isMobile) return;

    let idleId = 0;
    let timeoutId = 0;
    let cancelled = false;

    const enable = () => {
      if (!cancelled) setReady(true);
    };

    const afterPaint = () => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(enable, { timeout: 1500 });
        return;
      }
      timeoutId = window.setTimeout(enable, 200);
    };

    const raf2 = requestAnimationFrame(() => {
      requestAnimationFrame(afterPaint);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf2);
      if (idleId) window.cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isMobile]);

  if (isMobile || !ready) return null;

  return (
    <Suspense fallback={null}>
      <ParticleBackgroundImpl />
    </Suspense>
  );
}

export const ParticleBackground = memo(ParticleBackgroundWrapper);
