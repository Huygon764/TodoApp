import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost } from "@/lib/api";
import { serverOffsetMs } from "@/lib/stayClock";
import type { StayLevel, StayPauseReason, StayState } from "@/types/stay";

export const STAY_KEY = ["stay"] as const;
const REFRESH_MS = 60_000;

/** Server state plus the offset that turns local time into server time. */
export interface Synced<T> {
  state: T;
  offsetMs: number;
}

export function withOffset<T extends { serverNow: string }>(state: T): Synced<T> {
  return { state, offsetMs: serverOffsetMs(state.serverNow, Date.now()) };
}

/** Server-corrected now, ticking every second while `active`. */
export function useNow(offsetMs: number, active: boolean): number {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setTick(Date.now());
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return (active ? tick : Date.now()) + offsetMs;
}

export function useStay() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: STAY_KEY,
    queryFn: async () => {
      const res = await apiGet<StayState>(API_PATHS.STAY);
      return res.data ? withOffset(res.data) : null;
    },
    refetchInterval: REFRESH_MS,
  });

  const write = (res: { data?: StayState }) => {
    if (res.data) queryClient.setQueryData(STAY_KEY, withOffset(res.data));
    else queryClient.invalidateQueries({ queryKey: STAY_KEY });
  };
  // A 409 means the stored state moved on (other device, midnight): reload it.
  const resync = () => queryClient.invalidateQueries({ queryKey: STAY_KEY });

  const start = useMutation({
    mutationFn: () => apiPost<StayState>(API_PATHS.STAY_START, {}),
    onSuccess: write,
    onError: resync,
  });
  const pause = useMutation({
    mutationFn: (reason: StayPauseReason) =>
      apiPost<StayState>(API_PATHS.STAY_PAUSE, { reason }),
    onSuccess: write,
    onError: resync,
  });
  const resume = useMutation({
    mutationFn: () => apiPost<StayState>(API_PATHS.STAY_RESUME, {}),
    onSuccess: write,
    onError: resync,
  });
  const setLevel = useMutation({
    mutationFn: (level: StayLevel) =>
      apiPost<StayState>(API_PATHS.STAY_LEVEL, { level }),
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
    setLevel,
    busy: start.isPending || pause.isPending || resume.isPending || setLevel.isPending,
  };
}
