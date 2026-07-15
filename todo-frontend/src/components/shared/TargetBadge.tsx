interface TargetBadgeProps {
  target: number;
}

/**
 * Static "xN" badge for a counter target in read-only (template) contexts,
 * where there is no running count to tap. The interactive version is CounterChip.
 */
export function TargetBadge({ target }: TargetBadgeProps) {
  return (
    <span className="shrink-0 rounded-full border border-accent-primary/25 bg-accent-primary/10 px-2 py-0.5 text-xs font-semibold text-accent-hover tabular-nums">
      &times;{target}
    </span>
  );
}
