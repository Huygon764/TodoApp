import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiPost } from "@/lib/api";

export function LogoutButton() {
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
      className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 text-sm transition disabled:opacity-50"
    >
      Đăng xuất
    </motion.button>
  );
}
