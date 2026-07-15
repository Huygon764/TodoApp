import { motion } from "framer-motion";

interface CounterChipProps {
  count: number;
  target: number;
  /** Tap handler: +1, or reset to 0 when already full. */
  onIncrement: () => void;
  size?: "md" | "sm";
  isMobile?: boolean;
}

/**
 * Repetition counter as a single tappable chip (spec variant B): each tap adds
 * one, the fill grows left-to-right like a progress bar, and reaching the target
 * turns it green. Tapping a full chip resets it to zero.
 */
export function CounterChip({
  count,
  target,
  onIncrement,
  size = "md",
  isMobile = false,
}: CounterChipProps) {
  const clamped = Math.max(0, Math.min(target, count));
  const full = clamped >= target;
  const pct = target > 0 ? (clamped / target) * 100 : 0;
  const pad = size === "sm" ? "px-2 py-1 text-xs" : "px-2.5 py-1.5 text-xs";

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      whileHover={isMobile ? undefined : { scale: 1.04 }}
      onClick={onIncrement}
      aria-label={`${clamped} of ${target}${full ? ", tap to reset" : ", tap to add one"}`}
      className={`shrink-0 relative overflow-hidden isolate flex items-center gap-0.5 rounded-full border font-semibold leading-none tabular-nums cursor-pointer transition-colors duration-200 ${pad} ${
        full
          ? "border-accent-primary text-white"
          : "border-accent-primary/30 text-accent-hover"
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 -z-10 transition-[width] duration-300 ease-out ${
          full ? "bg-accent-primary" : "bg-accent-primary/25"
        }`}
        style={{ width: `${pct}%` }}
      />
      <span>{clamped}</span>
      <span className={full ? "text-white/70" : "text-text-muted"}>/{target}</span>
    </motion.button>
  );
}
