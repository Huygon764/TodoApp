import { useReducedMotion } from "framer-motion";
import { useIsMobile } from "./useIsMobile";

/** Hover grow for primary Add/Save only. Off on mobile and reduced-motion. */
export function usePrimaryHover() {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  if (isMobile || reduceMotion) return undefined;
  return { scale: 1.02 };
}
