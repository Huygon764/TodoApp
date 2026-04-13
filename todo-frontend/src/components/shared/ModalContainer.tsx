import { useState, useEffect } from "react";
import type { ReactNode, RefObject } from "react";
import { motion } from "framer-motion";

interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  maxWidth?: string;
  zBackdrop?: string;
  zContent?: string;
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
}: ModalContainerProps) {
  // Drive mount state from React, not framer-motion's AnimatePresence.
  // AnimatePresence can leave the backdrop stuck in the DOM (opacity: 0) when
  // nested layout-animated descendants disturb its exit tracking.
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return;
    }
    const timer = setTimeout(() => setShouldRender(false), EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: EXIT_DURATION_MS / 1000 }}
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${zBackdrop}`}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={
          isOpen
            ? { opacity: 1, scale: 1, y: 0 }
            : { opacity: 0, scale: 0.95, y: 20 }
        }
        transition={{ duration: EXIT_DURATION_MS / 1000 }}
        className={`fixed inset-0 ${zContent} flex items-center justify-center p-4 pointer-events-none`}
      >
        <div
          className={`relative w-full ${maxWidth} pointer-events-auto`}
          ref={contentRef as React.RefObject<HTMLDivElement>}
        >
          <div className="relative bg-bg-card rounded-3xl border border-border-default shadow-2xl overflow-hidden">
            {children}
          </div>
        </div>
      </motion.div>
    </>
  );
}
