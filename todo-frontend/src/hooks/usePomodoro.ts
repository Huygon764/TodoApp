import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { playSound } from "@/lib/sounds";
import { withOffset } from "@/hooks/useStay";
import type { PomodoroState } from "@/types/stay";

export const POMODORO_KEY = ["pomodoro"] as const;
const REFRESH_MS = 60_000;

export function usePomodoro() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: POMODORO_KEY,
    queryFn: async () => {
      const res = await apiGet<PomodoroState>(API_PATHS.POMODORO);
      return res.data ? withOffset(res.data) : null;
    },
    refetchInterval: REFRESH_MS,
  });

  const write = (res: { data?: PomodoroState }) => {
    if (res.data) queryClient.setQueryData(POMODORO_KEY, withOffset(res.data));
    else queryClient.invalidateQueries({ queryKey: POMODORO_KEY });
  };
  const resync = () => queryClient.invalidateQueries({ queryKey: POMODORO_KEY });

  const start = useMutation({
    mutationFn: () => apiPost<PomodoroState>(API_PATHS.POMODORO_START, {}),
    onSuccess: (res) => {
      write(res);
      if (res.data?.phase === "work") playSound("work-start");
    },
    onError: resync,
  });
  const pause = useMutation({
    mutationFn: () => apiPost<PomodoroState>(API_PATHS.POMODORO_PAUSE, {}),
    onSuccess: write,
    onError: resync,
  });
  const resume = useMutation({
    mutationFn: () => apiPost<PomodoroState>(API_PATHS.POMODORO_RESUME, {}),
    onSuccess: write,
    onError: resync,
  });
  const stop = useMutation({
    mutationFn: () => apiPost<PomodoroState>(API_PATHS.POMODORO_STOP, {}),
    onSuccess: write,
    onError: resync,
  });
  const saveSettings = useMutation({
    mutationFn: (body: { workMin: number; restMin: number }) =>
      apiPut<PomodoroState>(API_PATHS.POMODORO_SETTINGS, body),
    onSuccess: write,
    onError: resync,
  });

  return {
    state: query.data?.state ?? null,
    offsetMs: query.data?.offsetMs ?? 0,
    isPending: query.isPending,
    refetch: query.refetch,
    start,
    pause,
    resume,
    stop,
    saveSettings,
    busy:
      start.isPending ||
      pause.isPending ||
      resume.isPending ||
      stop.isPending ||
      saveSettings.isPending,
  };
}
