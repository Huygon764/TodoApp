import { useEffect, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const options: ISourceOptions = {
  fullScreen: false,
  background: { color: "transparent" },
  particles: {
    number: { value: 200, density: { enable: true, width: 800, height: 800 } },
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
};

export function ParticleBackground() {
  const [init, setInit] = useState(false);

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
