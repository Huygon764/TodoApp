import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface ItemAddInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  placeholder: string;
  addLabel: string;
  disabled?: boolean;
}

export function ItemAddInput({
  value,
  onChange,
  onAdd,
  placeholder,
  addLabel,
  disabled,
}: ItemAddInputProps) {
  return (
    <div className="p-4 border-b border-border-subtle">
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Plus className="w-5 h-5 text-text-muted group-focus-within:text-accent-hover transition-colors" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-slate-100 placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50 hover:border-border-strong transition-all duration-200"
          />
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAdd}
          disabled={disabled ?? !value.trim()}
          className="px-5 py-3 rounded-xl bg-accent-primary hover:bg-accent-hover text-white font-semibold transition-all duration-200 shadow-lg shadow-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addLabel}
        </motion.button>
      </div>
    </div>
  );
}
