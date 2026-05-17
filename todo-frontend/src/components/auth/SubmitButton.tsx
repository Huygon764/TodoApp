import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";

interface SubmitButtonProps {
  pending: boolean;
  label: string;
  pendingLabel: string;
}

export function SubmitButton({
  pending,
  label,
  pendingLabel,
}: SubmitButtonProps) {
  const isMobile = useIsMobile();
  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={isMobile ? undefined : { scale: 1.02 }}
      whileTap={isMobile ? { scale: 0.99 } : { scale: 0.98 }}
      className="relative w-full py-3.5 rounded-xl font-semibold text-white overflow-hidden
        bg-accent-primary hover:bg-accent-hover
        disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
        transition-all duration-200 flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </motion.button>
  );
}
