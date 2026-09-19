import { useState, useEffect } from "react";
import type { ReactNode, RefObject } from "react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/useIsMobile";

interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  maxWidth?: string;
  zBackdrop?: string;
  zContent?: string;
  /** When false, the card does not scroll; children manage their own overflow. Default true. */
  scrollable?: boolean;
}

const EXIT_DURATION_MS = 220;

export function ModalContainer({
  isOpen,
  onClose,
  contentRef,
  children,
  maxWidth = "max-w-lg",
  zBackdrop = "z-[60]",
  zContent = "z-[70]",
  scrollable = true,
}: ModalContainerProps) {
  // Drive mount state from React, not framer-motion's AnimatePresence.
  // AnimatePresence can leave the backdrop stuck in the DOM (opacity: 0) when
  // nested layout-animated descendants disturb its exit tracking.
  const isMobile = useIsMobile();
  const durationMs = isMobile ? 120 : EXIT_DURATION_MS;
  const [shouldRender, setShouldRender] = useState(isOpen);

  // Re-open after an exit unmount must not paint a blank frame. Setting state
  // during render makes React retry before commit.
  if (isOpen && !shouldRender) {
    setShouldRender(true);
  }

  useEffect(() => {
    if (isOpen) return;
    const timer = setTimeout(() => setShouldRender(false), durationMs);
    return () => clearTimeout(timer);
  }, [isOpen, durationMs]);

  if (!shouldRender) return null;

  return (
    <>
      <motion.div
        initial={isMobile ? false : { opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: durationMs / 1000 }}
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 ${isMobile ? "" : "backdrop-blur-sm"} ${zBackdrop}`}
      />
      <motion.div
        initial={isMobile ? false : { opacity: 0, scale: 0.95, y: 20 }}
        animate={
          isOpen
            ? isMobile
              ? { opacity: 1 }
              : { opacity: 1, scale: 1, y: 0 }
            : isMobile
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.95, y: 20 }
        }
        transition={{ duration: durationMs / 1000 }}
        className={`fixed inset-0 ${zContent} flex items-center justify-center p-4 pointer-events-none`}
      >
        <div
          className={`relative w-full ${maxWidth} max-h-[90dvh] pointer-events-auto`}
          ref={contentRef as React.RefObject<HTMLDivElement>}
        >
          <div
            className={`relative bg-bg-card rounded-xl border border-border-default shadow-2xl overflow-hidden max-h-[90dvh] ${
              scrollable ? "overflow-y-auto" : "flex flex-col"
            }`}
          >
            {children}
          </div>
        </div>
      </motion.div>
    </>
  );
}
