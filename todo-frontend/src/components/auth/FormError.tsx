import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

/** Animated inline form error box used across the auth pages. */
export function FormError({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="flex items-center gap-2 p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-sm"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}
