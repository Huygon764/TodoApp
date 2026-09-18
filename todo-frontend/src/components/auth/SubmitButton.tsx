import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { usePrimaryHover } from "@/hooks/usePrimaryHover";

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
  const primaryHover = usePrimaryHover();
  return (
    <motion.button
      type="submit"
      disabled={pending}
      whileHover={primaryHover}
      whileTap={{ scale: 0.98 }}
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
