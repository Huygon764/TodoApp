import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiPost } from "@/lib/api";
import { ParticleBackground } from "@/components/ParticleBackground";
import { useIsMobile } from "@/hooks/useIsMobile";

// Animated Background (solid Linear style; particles added in Phase 5)
const AnimatedBackground = () => {
  return (
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
};

// Logo Component
const AppLogo = ({ isMobile }: { isMobile: boolean }) => (
  <motion.div
    initial={isMobile ? { opacity: 0, scale: 0.92 } : { scale: 0, rotate: -180 }}
    animate={isMobile ? { opacity: 1, scale: 1 } : { scale: 1, rotate: 0 }}
    transition={
      isMobile
        ? { duration: 0.2, ease: "easeOut" }
        : { type: "spring", duration: 0.8 }
    }
    className="relative w-16 h-16 mx-auto mb-4"
  >
    <div className="relative w-full h-full bg-accent-primary rounded-2xl flex items-center justify-center shadow-lg shadow-accent-primary/25">
      <span className="text-2xl font-bold text-white">✓</span>
    </div>
  </motion.div>
);

export function LoginPage() {
  const isMobile = useIsMobile();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.HOME;
  const buttonHover = isMobile ? undefined : { scale: 1.02 };
  const buttonTap = isMobile ? { scale: 0.99 } : { scale: 0.98 };
  const getFadeUpMotion = (desktopDelay = 0, mobileOffset = 8) => ({
    initial: { opacity: 0, y: isMobile ? mobileOffset / 2 : mobileOffset },
    animate: { opacity: 1, y: 0 },
    transition: isMobile
      ? { duration: 0.18, ease: "easeOut" }
      : { duration: 0.6, ease: "easeOut", delay: desktopDelay },
  });
  const getSlideInMotion = (desktopDelay = 0) => ({
    initial: isMobile ? { opacity: 0, y: 6 } : { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, y: 0 },
    transition: isMobile
      ? { duration: 0.18, ease: "easeOut" }
      : { delay: desktopDelay },
  });

  const loginMutation = useMutation({
    mutationFn: () =>
      apiPost<{ message: string }>(API_PATHS.AUTH_LOGIN, {
        username,
        password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      navigate(from, { replace: true });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AnimatedBackground />

      <motion.div
        {...getFadeUpMotion()}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="relative">
          <div className="relative bg-bg-card rounded-3xl border border-border-default p-8 sm:p-10 shadow-2xl">
            {/* Logo */}
            <AppLogo isMobile={isMobile} />

            {/* Header */}
            <motion.div
              {...getFadeUpMotion(0.2, 10)}
              className="text-center mb-8"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Todo App
              </h1>
              <p className="text-text-tertiary text-sm sm:text-base">
                Chào mừng trở lại! Đăng nhập để tiếp tục
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Input */}
              <motion.div
                {...getSlideInMotion(0.3)}
              >
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
              </motion.div>

              {/* Password Input */}
              <motion.div
                {...getSlideInMotion(0.4)}
              >
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
                    autoComplete="current-password"
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
              </motion.div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={
                    isMobile
                      ? { duration: 0.16, ease: "easeOut" }
                      : undefined
                  }
                  className="flex items-center gap-2 p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-sm"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.div
                {...getFadeUpMotion(0.5, 10)}
              >
                <motion.button
                  type="submit"
                  disabled={loginMutation.isPending}
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                  className="relative w-full py-3.5 rounded-xl font-semibold text-white overflow-hidden
                    bg-accent-primary hover:bg-accent-hover
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
                    transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span className="relative flex items-center justify-center gap-2">
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Đang đăng nhập...
                      </>
                    ) : (
                      "Đăng nhập"
                    )}
                  </span>
                </motion.button>
              </motion.div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
