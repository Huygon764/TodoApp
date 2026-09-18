/** Pulse rows for a list that is still fetching. Do not use the empty state yet. */
export function ListSkeleton({
  rows = 3,
  rowClassName = "h-14",
}: {
  rows?: number;
  rowClassName?: string;
}) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className={`${rowClassName} rounded-xl bg-bg-elevated animate-pulse`}
        />
      ))}
    </div>
  );
}
