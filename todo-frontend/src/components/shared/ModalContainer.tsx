import type { ReactNode, RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  contentRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  maxWidth?: string;
  zBackdrop?: string;
  zContent?: string;
}

export function ModalContainer({
  isOpen,
  onClose,
  contentRef,
  children,
  maxWidth = "max-w-lg",
  zBackdrop = "z-[60]",
  zContent = "z-[70]",
}: ModalContainerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm ${zBackdrop}`}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 ${zContent} flex items-center justify-center p-4 pointer-events-none`}
          >
            <div className={`relative w-full ${maxWidth} pointer-events-auto`} ref={contentRef as React.RefObject<HTMLDivElement>}>
              <div className="relative bg-bg-card rounded-3xl border border-border-default shadow-2xl overflow-hidden">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
