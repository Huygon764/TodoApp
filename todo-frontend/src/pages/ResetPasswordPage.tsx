import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiPost } from "@/lib/api";
import { useCodeCheck } from "@/hooks/useCodeCheck";
import { AuthShell } from "@/components/auth/AuthShell";
import { CodeGate } from "@/components/auth/CodeGate";
import { PasswordField } from "@/components/auth/PasswordField";
import { FormError } from "@/components/auth/FormError";
import { SubmitButton } from "@/components/auth/SubmitButton";

const RESET_REASON_MESSAGE: Record<string, string> = {
  not_found: "Link đặt lại mật khẩu không hợp lệ.",
  expired: "Link đặt lại mật khẩu đã hết hạn.",
  used: "Link đặt lại mật khẩu đã được sử dụng.",
  revoked: "Link đặt lại mật khẩu đã bị thu hồi.",
};

interface ResetCheck {
  valid: boolean;
  username?: string;
  reason?: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { code, checking, invalid, invalidMessage, data: reset } =
    useCodeCheck<ResetCheck>({
      queryKey: "reset",
      pathFn: API_PATHS.AUTH_RESET_CHECK,
      noCodeMessage: "Thiếu mã. Vui lòng dùng link được cấp.",
      reasonMessages: RESET_REASON_MESSAGE,
      fallbackMessage: "Link đặt lại mật khẩu không hợp lệ.",
    });

  const resetMutation = useMutation({
    mutationFn: () =>
      apiPost<{ message: string }>(API_PATHS.AUTH_RESET, {
        code,
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
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      setError("Mật khẩu nhập lại không khớp.");
      return;
    }
    resetMutation.mutate();
  };

  return (
    <AuthShell subtitle="Đặt lại mật khẩu">
      <CodeGate
        checking={checking}
        invalid={invalid}
        invalidMessage={invalidMessage}
        checkingLabel="Đang kiểm tra link..."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {reset?.username && (
            <p className="text-text-tertiary text-sm text-center">
              Đặt lại mật khẩu cho:{" "}
              <span className="text-white">{reset.username}</span>
            </p>
          )}

          <PasswordField
            label="Mật khẩu mới"
            value={password}
            onChange={setPassword}
            placeholder="Nhập mật khẩu mới"
            show={showPassword}
            onToggleShow={() => setShowPassword((s) => !s)}
          />

          <PasswordField
            label="Nhập lại mật khẩu"
            value={confirm}
            onChange={setConfirm}
            placeholder="Nhập lại mật khẩu mới"
            show={showPassword}
          />

          {error && <FormError message={error} />}

          <SubmitButton
            pending={resetMutation.isPending}
            label="Đặt lại mật khẩu"
            pendingLabel="Đang đặt lại..."
          />
        </form>
      </CodeGate>
    </AuthShell>
  );
}
