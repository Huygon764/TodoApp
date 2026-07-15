import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { useModalClose } from "@/hooks/useModalClose";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as a destructive action. */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Small reusable yes/no modal, replaces window.confirm for a consistent look. */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  useModalClose(isOpen, onClose, contentRef);

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      contentRef={contentRef}
      maxWidth="max-w-sm"
      zBackdrop="z-[80]"
      zContent="z-[90]"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span
            className={`shrink-0 mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center ${
              danger ? "bg-danger-bg text-danger" : "bg-accent-primary/10 text-accent-hover"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-text-tertiary leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary bg-bg-surface border border-border-subtle hover:border-border-strong transition-colors cursor-pointer"
          >
            {cancelLabel ?? t("common.cancel", "Cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors cursor-pointer ${
              danger
                ? "bg-danger hover:bg-danger/90"
                : "bg-accent-primary hover:bg-accent-hover"
            }`}
          >
            {confirmLabel ?? t("common.confirm", "Confirm")}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}
