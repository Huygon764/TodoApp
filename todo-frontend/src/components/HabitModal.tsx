import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Repeat, Trash2, Plus } from "lucide-react";
import type { Habit } from "@/types";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { useModalClose } from "@/hooks/useModalClose";
import { useInlineEdit } from "@/hooks/useInlineEdit";

const WEEKDAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 7, label: "S" },
];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

interface HabitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (day: number) => {
    const next = value.includes(day)
      ? value.filter((d) => d !== day)
      : [...value, day].sort((a, b) => a - b);
    if (next.length > 0) onChange(next); // never allow an empty schedule
  };
  return (
    <div className="flex gap-1">
      {WEEKDAYS.map((wd, i) => {
        const active = value.includes(wd.value);
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggle(wd.value)}
            className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              active
                ? "bg-accent-primary text-white"
                : "bg-bg-surface text-text-muted hover:text-text-secondary border border-border-subtle"
            }`}
            aria-pressed={active}
            aria-label={`day ${wd.value}`}
          >
            {wd.label}
          </button>
        );
      })}
    </div>
  );
}

export function HabitModal({ isOpen, onClose }: HabitModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  useModalClose(isOpen, onClose, contentRef);

  const [newName, setNewName] = useState("");
  const [newDays, setNewDays] = useState<number[]>(ALL_DAYS);
  const { editingId, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit } =
    useInlineEdit<string>();

  const { data } = useQuery({
    queryKey: ["habits"],
    queryFn: async () => {
      const res = await apiGet<{ habits: Habit[] }>(API_PATHS.HABITS);
      return res.data?.habits ?? [];
    },
    enabled: isOpen,
  });
  const habits = data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["habits"] });
    queryClient.invalidateQueries({ queryKey: ["habits", "today"] });
  };

  const createMutation = useMutation({
    mutationFn: (body: { name: string; daysOfWeek: number[] }) =>
      apiPost(API_PATHS.HABITS, body),
    onSuccess: invalidate,
  });
  const patchMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; daysOfWeek?: number[]; order?: number }) =>
      apiPatch(API_PATHS.HABIT_BY_ID(id), body),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(API_PATHS.HABIT_BY_ID(id)),
    onSuccess: invalidate,
  });

  const addHabit = () => {
    const name = newName.trim();
    if (!name) return;
    createMutation.mutate({ name, daysOfWeek: newDays });
    setNewName("");
    setNewDays(ALL_DAYS);
  };

  const saveName = (id: string) => {
    const value = finishEdit();
    if (value == null) return;
    const name = value.trim();
    if (name) patchMutation.mutate({ id, name });
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef}>
      <ModalHeader
        icon={<Repeat className="w-5 h-5 text-accent-hover" />}
        title={t("habitModal.title", "Habits")}
        subtitle={t("habitModal.subtitle", "Things you must do, tracked daily")}
        onClose={onClose}
      />

      <div className="p-4 border-b border-border-subtle space-y-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addHabit()}
          placeholder={t("habitModal.addPlaceholder", "New habit, e.g. Get up before 6")}
          className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-subtle text-slate-100 placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
        />
        <div className="flex items-center justify-between gap-3">
          <WeekdayPicker value={newDays} onChange={setNewDays} />
          <button
            type="button"
            onClick={addHabit}
            disabled={!newName.trim()}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-hover text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t("habitModal.add", "Add")}
          </button>
        </div>
      </div>

      <div className="p-4 max-h-[340px] overflow-y-auto space-y-2">
        {habits.length === 0 ? (
          <div className="py-8 text-center text-text-muted">
            {t("habitModal.empty", "No habits yet")}
          </div>
        ) : (
          habits.map((h) => (
            <div
              key={h._id}
              className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border-subtle"
            >
              <div className="flex-1 min-w-0 space-y-2.5">
                {editingId === h._id ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveName(h._id);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    onBlur={() => saveName(h._id)}
                    className="w-full px-0 py-0.5 bg-transparent border-none outline-none text-text-secondary focus:ring-0"
                  />
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => startEdit(h._id, h.name)}
                    onKeyDown={(e) => e.key === "Enter" && startEdit(h._id, h.name)}
                    className="block [overflow-wrap:anywhere] text-text-secondary cursor-text"
                  >
                    {h.name}
                  </span>
                )}
                <WeekdayPicker
                  value={h.daysOfWeek}
                  onChange={(daysOfWeek) => patchMutation.mutate({ id: h._id, daysOfWeek })}
                />
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(h._id)}
                className="shrink-0 self-center p-1.5 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-colors cursor-pointer"
                aria-label={t("habitModal.deleteAria", "Archive habit")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </ModalContainer>
  );
}
