import { useIsMobile } from "@/hooks/useIsMobile";

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type RingColor = "accent" | "pause" | "done";

const ARC_STROKE: Record<RingColor, string> = {
  accent: "stroke-accent-primary",
  pause: "stroke-pause",
  done: "stroke-done",
};

export type LabelTone = "default" | "escape" | "pause" | "done";

const LABEL_TONE: Record<LabelTone, string> = {
  default: "text-text-tertiary",
  escape: "text-escape",
  pause: "text-pause",
  done: "text-done",
};

interface TimerRingProps {
  /** Filled share of the ring, 0..1. */
  fraction: number;
  color: RingColor;
  time: string;
  label: string;
  labelTone?: LabelTone;
  /** Dimmed time, for a timer that has not started. */
  dim?: boolean;
}

/** Thin circular timer: remaining time in the middle, state under it. */
export function TimerRing({
  fraction,
  color,
  time,
  label,
  labelTone = "default",
  dim = false,
}: TimerRingProps) {
  const isMobile = useIsMobile();
  const offset = CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, fraction)));
  return (
    <div className="relative w-64 h-64 mx-auto mt-4 mb-2">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          className="stroke-bg-elevated"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`${ARC_STROKE[color]} ${
            isMobile ? "" : "transition-[stroke-dashoffset,stroke] duration-500 ease-out"
          }`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className={`text-[46px] leading-[1.1] font-semibold tracking-[-1.5px] tabular-nums ${
            dim ? "text-text-tertiary" : "text-white"
          }`}
        >
          {time}
        </div>
        <div className={`text-[13px] mt-1 ${LABEL_TONE[labelTone]}`}>{label}</div>
      </div>
    </div>
  );
}
