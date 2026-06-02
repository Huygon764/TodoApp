import { useState, useEffect } from "react";

/**
 * Boolean state persisted to localStorage under `key`, so a UI preference
 * (e.g. a panel's open/closed state) survives reloads.
 */
export function usePersistentBoolean(key: string, defaultValue: boolean) {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? defaultValue : raw === "true";
    } catch {
      // Storage may be unavailable (private mode); fall back to the default.
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Persisting a cosmetic preference is best-effort; ignore storage errors.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
