import { useToast } from "@/lib/toast";

/** Renders the single active toast, if any. Mount once. */
export function Toaster() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-xl bg-bg-elevated border border-border-strong text-sm text-white shadow-2xl shadow-black/30"
    >
      {toast.text}
    </div>
  );
}
