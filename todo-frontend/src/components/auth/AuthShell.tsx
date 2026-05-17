import type { ReactNode } from "react";
import { ParticleBackground } from "@/components/ParticleBackground";

const AuthBackground = () => (
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

interface AuthShellProps {
  subtitle: string;
  children: ReactNode;
}

/** Shared card + background + logo wrapper for the auth pages. */
export function AuthShell({ subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <AuthBackground />
      <div className="w-full max-w-md relative z-10">
        <div className="relative bg-bg-card rounded-3xl border border-border-default p-8 sm:p-10 shadow-2xl">
          <AppLogo />
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Todo App
            </h1>
            <p className="text-text-tertiary text-sm sm:text-base">
              {subtitle}
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
