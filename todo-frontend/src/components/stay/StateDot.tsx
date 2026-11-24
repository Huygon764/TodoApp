export type DotState = "idle" | "run" | "pause" | "done";

const DOT_CLASS: Record<DotState, string> = {
  idle: "bg-text-muted",
  run: "bg-accent-hover",
  pause: "bg-pause",
  done: "bg-done",
};

export function StateDot({ state }: { state: DotState }) {
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_CLASS[state]}`} />;
}
