import { memo, useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";
import { useIsMobile } from "@/hooks/useIsMobile";

function ParticleBackgroundComponent() {
  const [init, setInit] = useState(false);
  const isMobile = useIsMobile();

  const options = useMemo<ISourceOptions>(
    () => ({
      fullScreen: false,
      background: { color: "transparent" },
      particles: {
        number: {
          value: isMobile ? 30 : 200,
          density: { enable: true, width: 800, height: 800 },
        },
        color: { value: ["#5E6AD2", "rgba(255,255,255,0.4)"] },
        opacity: { value: { min: 0.15, max: 0.4 } },
        size: { value: { min: 1, max: 2.5 } },
        move: {
          enable: true,
          speed: 0.9,
          direction: "none",
          random: true,
          straight: false,
          outModes: "out",
        },
      },
    }),
    [isMobile]
  );

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
      setInit(true);
    });
  }, []);

  if (!init) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <Particles
        id="linear-particles"
        options={options}
        style={{ width: "100%", height: "100%" }}
        className="absolute inset-0"
      />
    </div>
  );
}

/**
 * Memoized: the component takes no props, so this prevents the
 * expensive particles canvas from re-rendering/reinitializing every
 * time a parent re-renders (e.g. typing in a form, toggling a task).
 */
export const ParticleBackground = memo(ParticleBackgroundComponent);
