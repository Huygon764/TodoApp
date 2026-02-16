import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { DayTodo, DayTodoItem, DefaultItem } from "@/types";
import { DateNav } from "@/components/DateNav";
import { DayTodoList } from "@/components/DayTodoList";
import { DefaultList } from "@/components/DefaultList";
import { LogoutButton } from "@/components/LogoutButton";

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function HomePage() {
  const [selectedDate, setSelectedDate] = useState(todayString);
  const queryClient = useQueryClient();

  const { data: dayData, isLoading: dayLoading } = useQuery({
    queryKey: ["day", selectedDate],
    queryFn: async () => {
      const res = await apiGet<{ dayTodo: DayTodo }>(
        API_PATHS.DAY(selectedDate)
      );
      return res.data?.dayTodo ?? null;
    },
  });

  const { data: defaultData } = useQuery({
    queryKey: ["default"],
    queryFn: async () => {
      const res = await apiGet<{ items: DefaultItem[] }>(
        API_PATHS.DEFAULT
      );
      return res.data?.items ?? [];
    },
  });

  const patchDayMutation = useMutation({
    mutationFn: (items: DayTodoItem[]) =>
      apiPatch<{ dayTodo: DayTodo }>(
        API_PATHS.DAY(selectedDate),
        { items }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day", selectedDate] });
    },
  });

  const addDefaultMutation = useMutation({
    mutationFn: (title: string) =>
      apiPost<{ item: DefaultItem }>(API_PATHS.DEFAULT, {
        title,
        order: (defaultData?.length ?? 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default"] });
    },
  });

  const dayTodo = dayData ?? null;
  const defaultItems = defaultData ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Todo</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DateNav
            date={selectedDate}
            onDateChange={setSelectedDate}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <DayTodoList
            dayTodo={dayTodo}
            isLoading={dayLoading}
            onUpdateItems={(items) => patchDayMutation.mutate(items)}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <DefaultList
            items={defaultItems}
            onAddItem={(title) => addDefaultMutation.mutate(title)}
            onInvalidate={() =>
              queryClient.invalidateQueries({ queryKey: ["default"] })
            }
          />
        </motion.section>
      </main>
    </div>
  );
}
