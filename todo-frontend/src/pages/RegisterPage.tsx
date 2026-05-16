import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost } from "@/lib/api";
import { ParticleBackground } from "@/components/ParticleBackground";
import { useIsMobile } from "@/hooks/useIsMobile";

const AnimatedBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-bg-page" />
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
        backgroundSize: "40px 40px",
      }}
    />
    <ParticleBackground />
  </div>
);

const AppLogo = () => (
  <div className="relative w-16 h-16 mx-auto mb-4">
    <img
      src="/favicon.png"
      alt=""
      draggable={false}
      className="w-full h-full select-none"
    />
  </div>
);

const INVITE_REASON_MESSAGE: Record<string, string> = {
  not_found: "Mã mời không hợp lệ.",
  expired: "Mã mời đã hết hạn.",
  used: "Mã mời đã được sử dụng.",
  revoked: "Mã mời đã bị thu hồi.",
};

interface InviteCheck {
  valid: boolean;
  name?: string;
  reason?: string;
}

export function RegisterPage() {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const buttonHover = isMobile ? undefined : { scale: 1.02 };
  const buttonTap = isMobile ? { scale: 0.99 } : { scale: 0.98 };

  const {
    data: invite,
    isLoading: checking,
    isError: checkError,
  } = useQuery({
    queryKey: ["invite", "check", code],
    queryFn: async () => {
      const res = await apiGet<InviteCheck>(API_PATHS.AUTH_REGISTER_CHECK(code));
      return res.data ?? { valid: false, reason: "not_found" };
    },
    enabled: !!code,
    retry: false,
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      apiPost<{ message: string }>(API_PATHS.AUTH_REGISTER, {
        code,
        username,
        password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      navigate(ROUTES.HOME, { replace: true });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const name = username.trim();
    if (name.length < 3 || name.length > 30) {
      setError("Tên đăng nhập phải từ 3 đến 30 ký tự.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      setError("Tên đăng nhập chỉ gồm chữ, số và dấu gạch dưới.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    registerMutation.mutate();
  };

  const inviteInvalid =
    !code || checkError || (!checking && (!invite || !invite.valid));
  const invalidMessage = !code
    ? "Thiếu mã mời. Vui lòng dùng link được cấp."
    : INVITE_REASON_MESSAGE[invite?.reason ?? "not_found"] ??
      "Mã mời không hợp lệ.";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AnimatedBackground />

      <div className="w-full max-w-md relative z-10">
        <div className="relative bg-bg-card rounded-3xl border border-border-default p-8 sm:p-10 shadow-2xl">
          <AppLogo />

          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Todo App
            </h1>
            <p className="text-text-tertiary text-sm sm:text-base">
              Tạo tài khoản để bắt đầu
            </p>
          </div>

          {checking && code && (
            <div className="flex items-center justify-center py-10 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Đang kiểm tra mã mời...
            </div>
          )}

          {!checking && inviteInvalid && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-danger-bg border border-danger-border text-danger text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{invalidMessage}</span>
            </div>
          )}

          {!checking && !inviteInvalid && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {invite?.name && (
                <p className="text-text-tertiary text-sm text-center">
                  Lời mời cho: <span className="text-white">{invite.name}</span>
                </p>
              )}

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Tên đăng nhập
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-text-muted group-focus-within:text-accent-hover transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-bg-elevated border border-border-subtle text-white placeholder-text-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50
                      hover:border-border-strong transition-all duration-200"
                    placeholder="Nhập tên đăng nhập"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Mật khẩu
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-muted group-focus-within:text-accent-hover transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-bg-elevated border border-border-subtle text-white placeholder-text-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50
                      hover:border-border-strong transition-all duration-200"
                    placeholder="Nhập mật khẩu"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-secondary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-text-secondary text-sm font-medium mb-2">
                  Nhập lại mật khẩu
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-muted group-focus-within:text-accent-hover transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-bg-elevated border border-border-subtle text-white placeholder-text-muted
                      focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50
                      hover:border-border-strong transition-all duration-200"
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-sm"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={registerMutation.isPending}
                whileHover={buttonHover}
                whileTap={buttonTap}
                className="relative w-full py-3.5 rounded-xl font-semibold text-white overflow-hidden
                  bg-accent-primary hover:bg-accent-hover
                  disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
                  transition-all duration-200 flex items-center justify-center gap-2"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Đang tạo tài khoản...
                  </>
                ) : (
                  "Tạo tài khoản"
                )}
              </motion.button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
