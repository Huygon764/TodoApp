import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiPost } from "@/lib/api";

// Animated Background Component
const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0f172a] to-[#1a1f2e]" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Animated Orbs */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          top: '-10%',
          right: '-10%',
        }}
        animate={{
          y: [0, 50, 0],
          x: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          bottom: '-5%',
          left: '-5%',
        }}
        animate={{
          y: [0, -40, 0],
          x: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-[300px] h-[300px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, transparent 70%)',
          filter: 'blur(40px)',
          top: '50%',
          left: '20%',
        }}
        animate={{
          y: [0, 60, 0],
          x: [0, -20, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-[250px] h-[250px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          filter: 'blur(45px)',
          top: '30%',
          right: '15%',
        }}
        animate={{
          y: [0, -50, 0],
          x: [0, 30, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

// Logo Component
const AppLogo = () => (
  <motion.div
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    transition={{ type: "spring", duration: 0.8 }}
    className="relative w-16 h-16 mx-auto mb-4"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl rotate-6 opacity-50 blur-sm" />
    <div className="relative w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
      <span className="text-2xl font-bold text-white">✓</span>
    </div>
  </motion.div>
);

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.HOME;

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
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="relative">
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-50" />
          
          {/* Card content */}
          <div className="relative bg-[#1a1f2e]/80 backdrop-blur-xl rounded-3xl border border-white/[0.08] p-8 sm:p-10 shadow-2xl">
            {/* Logo */}
            <AppLogo />

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Todo App
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">
                Chào mừng trở lại! Đăng nhập để tiếp tục
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Tên đăng nhập
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 
                      hover:border-slate-600 transition-all duration-200"
                    placeholder="Nhập tên đăng nhập"
                    autoComplete="username"
                  />
                </div>
              </motion.div>

              {/* Password Input */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Mật khẩu
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 
                      focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 
                      hover:border-slate-600 transition-all duration-200"
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
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
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <motion.button
                  type="submit"
                  disabled={loginMutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full py-3.5 rounded-xl font-semibold text-white overflow-hidden
                    disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
                    transition-all duration-200 group"
                >
                  {/* Button gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-200 group-hover:from-emerald-400 group-hover:to-teal-400" />
                  
                  {/* Button glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 blur-xl" />
                  </div>

                  {/* Button content */}
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
