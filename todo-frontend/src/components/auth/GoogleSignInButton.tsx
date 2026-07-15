import { useEffect, useRef } from "react";

interface GoogleIdConfig {
  client_id: string;
  callback: (resp: { credential: string }) => void;
}
interface GoogleButtonOptions {
  theme?: string;
  size?: string;
  width?: number;
  text?: string;
  shape?: string;
}
interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (el: HTMLElement, options: GoogleButtonOptions) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
}

/** Renders the Google Identity Services button once the GIS script is ready. */
export function GoogleSignInButton({ onCredential }: GoogleSignInButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google || !ref.current) return false;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp) => onCredential(resp.credential),
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: "outline",
        size: "large",
        width: 300,
        text: "continue_with",
        shape: "pill",
      });
      return true;
    };

    // The GIS script loads async; poll briefly until window.google appears.
    if (!render()) {
      const timer = setInterval(() => {
        if (render()) clearInterval(timer);
      }, 200);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [clientId, onCredential]);

  if (!clientId) {
    return (
      <p className="text-sm text-text-muted text-center">
        Google sign-in is not configured.
      </p>
    );
  }
  return <div ref={ref} className="flex justify-center min-h-[44px]" />;
}
