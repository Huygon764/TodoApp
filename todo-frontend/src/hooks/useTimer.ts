import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost } from "@/lib/api";
import { stopRepeatedSound } from "@/lib/sounds";
import { withOffset } from "@/hooks/useStay";
import type { TimerState } from "@/types/stay";

export const TIMER_KEY = ["timer"] as const;
const REFRESH_MS = 60_000;

export function useTimer() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: TIMER_KEY,
    queryFn: async () => {
      const res = await apiGet<TimerState>(API_PATHS.TIMER);
      return res.data ? withOffset(res.data) : null;
    },
    refetchInterval: REFRESH_MS,
  });

  const write = (res: { data?: TimerState }) => {
    if (res.data) queryClient.setQueryData(TIMER_KEY, withOffset(res.data));
    else queryClient.invalidateQueries({ queryKey: TIMER_KEY });
  };
  // A 409 means the stored state moved on (other device, zero reached): reload it.
  const resync = () => queryClient.invalidateQueries({ queryKey: TIMER_KEY });

  const start = useMutation({
    mutationFn: (body: { lengthMs: number; label: string }) =>
      apiPost<TimerState>(API_PATHS.TIMER_START, body),
    onSuccess: write,
    onError: resync,
  });
  const pause = useMutation({
    mutationFn: () => apiPost<TimerState>(API_PATHS.TIMER_PAUSE, {}),
    onSuccess: write,
    onError: resync,
  });
  const resume = useMutation({
    mutationFn: () => apiPost<TimerState>(API_PATHS.TIMER_RESUME, {}),
    onSuccess: write,
    onError: resync,
  });
  const stop = useMutation({
    mutationFn: () => apiPost<TimerState>(API_PATHS.TIMER_STOP, {}),
    onSuccess: write,
    onError: resync,
  });
  const add = useMutation({
    mutationFn: (ms: number) => apiPost<TimerState>(API_PATHS.TIMER_ADD, { ms }),
    onSuccess: write,
    onError: resync,
  });
  const dismiss = useMutation({
    mutationFn: () => apiPost<TimerState>(API_PATHS.TIMER_DISMISS, {}),
    // The sound stops on the click, not when the reply arrives.
    onMutate: () => stopRepeatedSound(),
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
    add,
    dismiss,
    busy:
      start.isPending ||
      pause.isPending ||
      resume.isPending ||
      stop.isPending ||
      add.isPending ||
      dismiss.isPending,
  };
}
