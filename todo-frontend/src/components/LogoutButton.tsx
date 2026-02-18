import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { LogOut, Loader2 } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiPost } from "@/lib/api";

export function LogoutButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => apiPost(API_PATHS.AUTH_LOGOUT, {}),
    onSuccess: () => {
      queryClient.clear();
      navigate(ROUTES.LOGIN, { replace: true });
    },
  });

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-400 bg-slate-800/50 hover:bg-red-500/10 border border-white/[0.06] hover:border-red-500/30 transition-all duration-200 disabled:opacity-50 cursor-pointer"
    >
      {logoutMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
      <span className="text-sm font-medium hidden sm:inline">{t("home.logout")}</span>
    </motion.button>
  );
}
