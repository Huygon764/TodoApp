import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface ModalHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Extra buttons to render before the close button */
  extraActions?: ReactNode;
}

export function ModalHeader({
  icon,
  title,
  subtitle,
  onClose,
  extraActions,
}: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-border-default">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent-primary/10">{icon}</div>
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {extraActions}
        <motion.button
          type="button"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 rounded-xl text-text-tertiary hover:text-white hover:bg-bg-surface transition-all duration-200"
        >
          <X className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
