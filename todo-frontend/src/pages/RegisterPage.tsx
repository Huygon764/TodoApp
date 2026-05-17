import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiPost } from "@/lib/api";
import { useCodeCheck } from "@/hooks/useCodeCheck";
import { AuthShell } from "@/components/auth/AuthShell";
import { CodeGate } from "@/components/auth/CodeGate";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { code, checking, invalid, invalidMessage, data: invite } =
    useCodeCheck<InviteCheck>({
      queryKey: "invite",
      pathFn: API_PATHS.AUTH_REGISTER_CHECK,
      noCodeMessage: "Thiếu mã mời. Vui lòng dùng link được cấp.",
      reasonMessages: INVITE_REASON_MESSAGE,
      fallbackMessage: "Mã mời không hợp lệ.",
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

  return (
    <AuthShell subtitle="Tạo tài khoản để bắt đầu">
      <CodeGate
        checking={checking}
        invalid={invalid}
        invalidMessage={invalidMessage}
        checkingLabel="Đang kiểm tra mã mời..."
      >
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

          <PasswordField
            label="Mật khẩu"
            value={password}
            onChange={setPassword}
            placeholder="Nhập mật khẩu"
            show={showPassword}
            onToggleShow={() => setShowPassword((s) => !s)}
          />

          <PasswordField
            label="Nhập lại mật khẩu"
            value={confirm}
            onChange={setConfirm}
            placeholder="Nhập lại mật khẩu"
            show={showPassword}
          />

          {error && <FormError message={error} />}

          <SubmitButton
            pending={registerMutation.isPending}
            label="Tạo tài khoản"
            pendingLabel="Đang tạo tài khoản..."
          />
        </form>
      </CodeGate>
    </AuthShell>
  );
}
