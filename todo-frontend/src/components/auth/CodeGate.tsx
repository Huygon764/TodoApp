import type { ReactNode } from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface CodeGateProps {
  checking: boolean;
  invalid: boolean;
  invalidMessage: string;
  checkingLabel: string;
  children: ReactNode;
}

/** Renders the checking spinner / invalid box / the gated content. */
export function CodeGate({
  checking,
  invalid,
  invalidMessage,
  checkingLabel,
  children,
}: CodeGateProps) {
  if (checking) {
    return (
      <div className="flex items-center justify-center py-10 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {checkingLabel}
      </div>
    );
  }
  if (invalid) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-lg bg-danger-bg border border-danger-border text-danger text-sm">
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{invalidMessage}</span>
      </div>
    );
  }
  return <>{children}</>;
}
