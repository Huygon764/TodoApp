import { lazy, memo, Suspense, useEffect, useState } from "react";

const ParticleBackgroundImpl = lazy(() => import("./ParticleBackgroundImpl"));

/**
 * Decorative particles. The tsparticles chunk is not imported until after
 * first paint so login LCP is the form, not this background.
 */
function ParticleBackgroundWrapper() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
  }, []);

  if (!ready) return null;

  return (
    <Suspense fallback={null}>
      <ParticleBackgroundImpl />
    </Suspense>
  );
}

export const ParticleBackground = memo(ParticleBackgroundWrapper);
