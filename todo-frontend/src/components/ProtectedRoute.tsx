import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { API_PATHS } from "@/constants/api";
import { apiGet } from "@/lib/api";
import type { User } from "@/types";
import { ScreenFallback } from "@/components/shared/ScreenFallback";

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
    return <ScreenFallback />;
  }

  if (isError || !data) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
