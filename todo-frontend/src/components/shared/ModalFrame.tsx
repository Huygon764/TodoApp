import type { ReactNode, RefObject } from "react";
import { ModalContainer } from "@/components/shared/ModalContainer";

interface ModalFrameProps {
  embedded?: boolean;
  isOpen: boolean;
  onClose: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  zBackdrop?: string;
  zContent?: string;
}

/** Full-screen modal chrome, or a bare panel when nested in another modal. */
export function ModalFrame({
  embedded = false,
  isOpen,
  onClose,
  contentRef,
  children,
  zBackdrop,
  zContent,
}: ModalFrameProps) {
  if (embedded) {
    return <div ref={contentRef as RefObject<HTMLDivElement>}>{children}</div>;
  }
  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      contentRef={contentRef}
      zBackdrop={zBackdrop}
      zContent={zContent}
    >
      {children}
    </ModalContainer>
  );
}
