import { Component, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  /** Shown in place of the children when they throw during render. */
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors in its subtree so one broken component shows a fallback
 * instead of blanking the whole app. Pass a changing `key` (e.g. the selected
 * date) to reset it after navigation.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log it (do not swallow silently); the boundary only stops the crash from
    // propagating to the whole app.
    console.error("ErrorBoundary caught an error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
