import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiGet } from "@/lib/api";
import type { User } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await apiGet<{ user: User }>(API_PATHS.AUTH_ME);
      return res.data?.user ?? null;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-pulse text-slate-400">Đang tải...</div>
      </div>
    );
  }

  if (isError || !data) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
