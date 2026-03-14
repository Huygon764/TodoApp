import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { LogOut, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiPost } from "@/lib/api";

interface LogoutButtonProps {
  variant?: "default" | "menu";
  onAfterClick?: () => void;
}

export function LogoutButton({
  variant = "default",
  onAfterClick,
}: LogoutButtonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMenu = variant === "menu";

  const logoutMutation = useMutation({
    mutationFn: () => apiPost(API_PATHS.AUTH_LOGOUT, {}),
    onSuccess: () => {
      queryClient.clear();
      onAfterClick?.();
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });

  return (
    <motion.button
      type="button"
      whileHover={isMenu ? undefined : { scale: 1.02 }}
      whileTap={isMenu ? { scale: 0.99 } : { scale: 0.98 }}
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
      className={
        isMenu
          ? "flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50 cursor-pointer text-left"
          : "flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-400 bg-slate-800/50 hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
      }
    >
      {logoutMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      <span className={isMenu ? "text-sm font-medium" : "text-sm font-medium hidden sm:inline"}>
        {t("home.logout")}
      </span>
    </motion.button>
  );
}
