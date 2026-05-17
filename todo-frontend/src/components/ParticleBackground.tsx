import { lazy, memo, Suspense } from "react";

const ParticleBackgroundImpl = lazy(
  () => import("./ParticleBackgroundImpl")
);

/**
 * Public particles background.
 * - Lazy: @tsparticles is split into an async chunk so it does not
 *   bloat the initial/login bundle (fallback is null - it is a
 *   non-blocking decorative background).
 * - Memo: takes no props, so it never re-renders when a parent does
 *   (typing in a form, toggling a task).
 */
function ParticleBackgroundWrapper() {
  return (
    <Suspense fallback={null}>
      <ParticleBackgroundImpl />
    </Suspense>
  );
}

export const ParticleBackground = memo(ParticleBackgroundWrapper);
