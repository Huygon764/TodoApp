import { useEffect, type RefObject } from "react";

/**
 * Close modal when clicking outside the content area.
 * Replaces the repeated useEffect pattern across all modals.
 */
export function useModalClose(
  isOpen: boolean,
  onClose: () => void,
  contentRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose, contentRef]);
}
