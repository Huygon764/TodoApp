import { Lock, Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Controls input type so a single toggle can reveal multiple fields */
  show: boolean;
  /** When provided, renders the show/hide eye button */
  onToggleShow?: () => void;
  autoComplete?: string;
}

export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggleShow,
  autoComplete = "new-password",
}: PasswordFieldProps) {
  return (
    <div>
      <label className="block text-text-secondary text-sm font-medium mb-2">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-text-muted group-focus-within:text-accent-hover transition-colors" />
        </div>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-12 ${
            onToggleShow ? "pr-12" : "pr-4"
          } py-3.5 rounded-xl bg-bg-elevated border border-border-subtle text-white placeholder-text-muted
            focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50
            hover:border-border-strong transition-all duration-200`}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        {onToggleShow && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-secondary transition-colors"
          >
            {show ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
