import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const SPINNER_DELAY_MS = 200;

/** Full-screen wait: same page for route chunks and auth. */
export function ScreenFallback() {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setShowSpinner(true), SPINNER_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      className="min-h-screen bg-bg-page flex items-center justify-center"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {showSpinner ? (
        <Loader2 className="w-10 h-10 animate-spin text-text-muted" />
      ) : null}
    </div>
  );
}
