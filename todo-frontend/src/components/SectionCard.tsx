import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  onClick,
}: SectionCardProps) {
  const isMobile = useIsMobile();
  const cardHover = isMobile ? undefined : { scale: 1.01 };
  const cardTap = isMobile ? { scale: 0.995 } : { scale: 0.99 };

  return (
    <motion.button
      type="button"
      whileHover={cardHover}
      whileTap={cardTap}
      onClick={onClick}
      className="w-full p-4 rounded-2xl bg-linear-card/50 border border-white/[0.06] hover:border-[#5E6AD2]/30 hover:bg-linear-card/80 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10 text-[#7C85E0] group-hover:bg-[#5E6AD2]/20 transition-colors">
            <Icon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="font-medium text-slate-200">{title}</p>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="text-slate-500 group-hover:text-linear-accent-hover transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </motion.button>
  );
}
