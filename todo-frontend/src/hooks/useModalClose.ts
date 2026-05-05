import { useEffect, type RefObject } from "react";

/**
 * Close modal when clicking outside the content area.
 * Optional ignoreRefs lets callers exclude an anchor/trigger element
 * (e.g. the button that opens the popover) so clicks on it do not also close it.
 */
export function useModalClose(
  isOpen: boolean,
  onClose: () => void,
  contentRef: RefObject<HTMLElement | null>,
  ignoreRefs?: RefObject<HTMLElement | null>[],
) {
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (contentRef.current?.contains(target)) return;
      if (ignoreRefs?.some((ref) => ref.current?.contains(target))) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose, contentRef, ignoreRefs]);
}
