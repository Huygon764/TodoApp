import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { apiGet } from "@/lib/api";

export interface CodeCheckResult {
  valid: boolean;
  reason?: string;
}

interface UseCodeCheckOptions {
  /** React Query key prefix, e.g. "invite" or "reset" */
  queryKey: string;
  /** Builds the check endpoint from the code in the URL */
  pathFn: (code: string) => string;
  /** Shown when there is no ?code= at all */
  noCodeMessage: string;
  /** reason -> localized message */
  reasonMessages: Record<string, string>;
  /** Used when the reason is unknown */
  fallbackMessage: string;
}

/**
 * Shared "?code=" gate used by the register and reset pages: reads the
 * code from the URL, validates it, and derives the 3 states
 * (checking / invalid / valid) plus a localized invalid message.
 */
export function useCodeCheck<T extends CodeCheckResult>(
  opts: UseCodeCheckOptions
) {
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") ?? "";

  const {
    data,
    isLoading: checking,
    isError,
  } = useQuery({
    queryKey: [opts.queryKey, "check", code],
    queryFn: async () => {
      const res = await apiGet<T>(opts.pathFn(code));
      return res.data ?? ({ valid: false, reason: "not_found" } as T);
    },
    enabled: !!code,
    retry: false,
  });

  const invalid =
    !code || isError || (!checking && (!data || !data.valid));

  const invalidMessage = !code
    ? opts.noCodeMessage
    : opts.reasonMessages[data?.reason ?? "not_found"] ??
      opts.fallbackMessage;

  return { code, checking, invalid, invalidMessage, data };
}
