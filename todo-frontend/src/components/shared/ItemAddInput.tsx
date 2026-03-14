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
    <div className="p-4 border-b border-white/[0.04]">
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Plus className="w-5 h-5 text-slate-500 group-focus-within:text-linear-accent-hover transition-colors" />
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-linear-surface border border-white/[0.04] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/40 focus:border-[#5E6AD2]/50 hover:border-white/[0.1] transition-all duration-200"
          />
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAdd}
          disabled={disabled ?? !value.trim()}
          className="px-5 py-3 rounded-xl bg-linear-accent hover:bg-linear-accent-hover text-white font-semibold transition-all duration-200 shadow-lg shadow-[#5E6AD2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addLabel}
        </motion.button>
      </div>
    </div>
  );
}
