import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, Trash2, Check, Circle, Target, ChevronRight, ChevronDown } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ItemAddInput } from "@/components/shared/ItemAddInput";
import { ReorderItem } from "@/components/shared/ReorderItem";
import { SubTaskSection } from "@/components/shared/SubTaskSection";
import { PeriodSelector } from "@/components/shared/PeriodSelector";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useModalClose } from "@/hooks/useModalClose";
import { useSubTaskManager } from "@/hooks/useSubTaskManager";
import { addClientIds, removeClientIds } from "@/lib/itemIds";
import { sortItemsByCompletion, regroupByCompletion } from "@/lib/sortItems";
import {
  getWeekPeriod,
  getMonthPeriod,
  getYearPeriod,
  formatWeekPeriodLabel,
  formatMonthLabel,
  getWeekOptionsForPicker,
  getMonthOptionsForPicker,
  getYearOptionsForPicker,
} from "@/lib/datePeriod";
import { stepPeriod } from "@/lib/periodStep";
import type { Goal, GoalItem } from "@/types";

export type GoalPeriodType = "week" | "month" | "year";

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function addIdsToItems(items: GoalItem[]): (GoalItem & { id: string })[] {
  return addClientIds(items, "goal-item", 8) as (GoalItem & { id: string })[];
}

function removeIdsFromItems(
  items: (GoalItem & { id: string })[]
): GoalItem[] {
  return removeClientIds(items);
}

export function GoalModal({ isOpen, onClose }: GoalModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const controlHover = isMobile ? undefined : { scale: 1.1 };
  const controlTap = isMobile ? { scale: 0.96 } : { scale: 0.9 };
  const checkboxHover = isMobile ? undefined : { scale: 1.15 };
  const [activeTab, setActiveTab] = useState<GoalPeriodType>("week");
  const [selectedWeekPeriod, setSelectedWeekPeriod] = useState(getWeekPeriod());
  const [selectedMonthPeriod, setSelectedMonthPeriod] = useState(getMonthPeriod());
  const [selectedYearPeriod, setSelectedYearPeriod] = useState(getYearPeriod());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [localItems, setLocalItems] = useState<(GoalItem & { id: string })[]>([]);
  const { editingId, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit } = useInlineEdit<string>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<string, string>>({});
  const initialOrderRef = useRef<string>("");
  const contentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const period =
    activeTab === "week"
      ? selectedWeekPeriod
      : activeTab === "month"
        ? selectedMonthPeriod
        : selectedYearPeriod;
  const queryKey = ["goal", activeTab, period];

  // Reset to current periods when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedWeekPeriod(getWeekPeriod());
      setSelectedMonthPeriod(getMonthPeriod());
      setSelectedYearPeriod(getYearPeriod());
    }
  }, [isOpen]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ goal: Goal }>(
        API_PATHS.GOALS_QUERY(activeTab, period)
      );
      return res.data?.goal ?? null;
    },
    enabled: isOpen,
  });

  const goal = data ?? null;
  const sortedItemsFromGoal = sortItemsByCompletion(addIdsToItems(goal?.items ?? []));

  useEffect(() => {
    if (!isOpen) return;
    if (goal != null) {
      const next = sortItemsByCompletion(addIdsToItems(goal.items ?? []));
      setLocalItems(next);
      initialOrderRef.current = next.map((i) => i.id).join(",");
    } else {
      setLocalItems([]);
      initialOrderRef.current = "";
    }
  }, [isOpen, goal]);

  const sortedItems =
    localItems.length > 0 ? sortItemsByCompletion(localItems) : sortedItemsFromGoal;
  const incomplete = sortedItems.filter((i) => !i.completed);
  const completed = sortedItems.filter((i) => i.completed);

  const patchMutation = useMutation({
    mutationFn: (items: GoalItem[]) =>
      goal
        ? apiPatch<{ goal: Goal }>(API_PATHS.GOAL(goal._id), { items })
        : apiPost<{ goal: Goal }>(API_PATHS.GOALS, {
            type: activeTab,
            period,
            items,
          }),
    onMutate: async (items: GoalItem[]) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, {
        goal: goal ? { ...goal, items } : null,
      });
      return { previous };
    },
    onError: (_err, _items, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (items: GoalItem[]) =>
      goal
        ? apiPatch<{ goal: Goal }>(API_PATHS.GOAL(goal._id), { items })
        : Promise.reject(new Error("No goal")),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleCloseRef = useRef<() => void>(onClose);
  useModalClose(isOpen, () => handleCloseRef.current(), contentRef);

  const stepActivePeriod = (direction: "prev" | "next") => {
    if (activeTab === "week") {
      setSelectedWeekPeriod((p) => stepPeriod("week", p, direction));
    } else if (activeTab === "month") {
      setSelectedMonthPeriod((p) => stepPeriod("month", p, direction));
    } else {
      setSelectedYearPeriod((p) => stepPeriod("year", p, direction));
    }
  };
  const handlePrevPeriod = () => stepActivePeriod("prev");
  const handleNextPeriod = () => stepActivePeriod("next");

  const pickerOptions =
    activeTab === "week"
      ? getWeekOptionsForPicker(2, 6)
      : activeTab === "month"
        ? getMonthOptionsForPicker(1, 6)
        : getYearOptionsForPicker(1, 3);

  const periodLabel =
    activeTab === "week"
      ? `${period} (${formatWeekPeriodLabel(period)})`
      : activeTab === "month"
        ? formatMonthLabel(period)
        : t("goalModal.yearLabel", { period });

  const handleAdd = () => {
    const t = newTitle.trim();
    if (!t) return;
    const newItems = removeIdsFromItems(sortedItems).concat({
      title: t,
      completed: false,
      order: sortedItems.length,
    });
    patchMutation.mutate(newItems);
    setNewTitle("");
  };

  const handleToggle = (id: string) => {
    if (pendingToggle) return;
    setPendingToggle(id);
    const toggled = sortedItems.map((item) => {
      if (item.id !== id) return item;
      const nextCompleted = !item.completed;
      const subTasks = item.subTasks ?? [];
      if (nextCompleted && subTasks.length > 0) {
        return {
          ...item,
          completed: true,
          subTasks: subTasks.map((st) => ({ ...st, completed: true })),
        };
      }
      return { ...item, completed: nextCompleted };
    });
    const reordered = regroupByCompletion(toggled);
    setLocalItems(reordered);
    patchMutation.mutate(removeIdsFromItems(reordered));
    setTimeout(() => setPendingToggle(null), 150);
  };

  const subTaskManager = useSubTaskManager(localItems, (next) => {
    setLocalItems(next);
    patchMutation.mutate(removeIdsFromItems(next));
  });

  const addSubTask = (itemId: string, title: string) => {
    subTaskManager.addSubTask(itemId, title);
    setNewSubTaskTitle((prev) => ({ ...prev, [itemId]: "" }));
  };
  const toggleSubTask = subTaskManager.toggleSubTask;
  const deleteSubTask = subTaskManager.deleteSubTask;
  const editSubTask = subTaskManager.editSubTask;
  const moveSubTask = subTaskManager.moveSubTask;

  const handleDelete = (clientId: string) => {
    const filtered = sortedItems.filter((it) => it.id !== clientId);
    const reordered = removeIdsFromItems(
      filtered.map((it, i) => ({ ...it, order: i }))
    );
    if (goal) deleteItemMutation.mutate(reordered);
  };

  const handleSelectPeriod = (p: string) => {
    if (activeTab === "week") setSelectedWeekPeriod(p);
    else if (activeTab === "month") setSelectedMonthPeriod(p);
    else setSelectedYearPeriod(p);
    setPickerOpen(false);
  };

  const reorderIncomplete = (newIncomplete: (GoalItem & { id: string })[]) => {
    const withOrder = newIncomplete.map((it, idx) => ({ ...it, order: idx }));
    const completedWithOrder = completed.map((it, idx) => ({
      ...it,
      order: withOrder.length + idx,
    }));
    setLocalItems([...withOrder, ...completedWithOrder]);
  };

  const handleTitleClick = (id: string) => {
    const item = localItems.find((i) => i.id === id);
    if (item) startEdit(id, item.title);
  };

  const saveGoalTitle = (id: string) => {
    const value = finishEdit();
    if (!value) return;
    const updated = localItems.map((it) =>
      it.id === id ? { ...it, title: value } : it
    );
    setLocalItems(updated);
    if (goal) patchMutation.mutate(removeIdsFromItems(updated));
  };

  const reorderCompleted = (newCompleted: (GoalItem & { id: string })[]) => {
    const withOrder = newCompleted.map((it, idx) => ({
      ...it,
      order: incomplete.length + idx,
    }));
    setLocalItems([
      ...incomplete.map((it, idx) => ({ ...it, order: idx })),
      ...withOrder,
    ]);
  };

  const handleClose = () => {
    const currentOrder = localItems.map((i) => i.id).join(",");
    const shouldSave =
      currentOrder !== initialOrderRef.current && goal != null;
    if (shouldSave) {
      const payload = [...localItems]
        .sort((a, b) => a.order - b.order)
        .map((it, idx) => ({ ...it, order: idx }));
      const itemsToSave = removeIdsFromItems(payload);
      onClose();
      patchMutation.mutate(itemsToSave);
    } else {
      onClose();
    }
  };
  handleCloseRef.current = handleClose;

  const renderGoalItem = (item: GoalItem & { id: string }, dragHandle: ReactNode) => (
    <>
      <motion.div
        layout
        className={`flex items-center gap-4 p-3 rounded-xl border transition-colors duration-200 ${
          item.completed
            ? "bg-accent-primary/5 border-accent-primary/20"
            : "bg-bg-surface border-border-subtle hover:bg-bg-surface/80"
        }`}
        animate={{
          scale: pendingToggle === item.id ? 0.98 : 1,
        }}
        transition={{
          duration: isMobile ? 0.1 : 0.15,
          ease: "easeOut",
        }}
      >
        <motion.button
          type="button"
          whileHover={checkboxHover}
          whileTap={controlTap}
          onClick={() => handleToggle(item.id)}
          disabled={pendingToggle !== null}
          className={`shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
            item.completed
              ? "bg-accent-primary border-accent-primary"
              : "border-text-muted hover:border-accent-hover hover:bg-accent-primary/10"
          } disabled:cursor-not-allowed`}
        >
          <AnimatePresence mode="wait">
            {item.completed && (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 45 }}
                transition={
                  isMobile
                    ? { duration: 0.12, ease: "easeOut" }
                    : { type: "spring", stiffness: 500, damping: 15 }
                }
              >
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
        {editingId === item.id ? (
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveGoalTitle(item.id);
              if (e.key === "Escape") cancelEdit();
            }}
            onBlur={() => saveGoalTitle(item.id)}
            className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-text-secondary focus:ring-0"
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            onClick={() => handleTitleClick(item.id)}
            onKeyDown={(e) => e.key === "Enter" && handleTitleClick(item.id)}
            className={`flex-1 cursor-text ${
              item.completed ? "line-through text-text-muted" : "text-text-secondary"
            }`}
          >
            {item.title}
          </span>
        )}
        <motion.button
          type="button"
          whileHover={controlHover}
          whileTap={controlTap}
          onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
          className="p-2 rounded-lg text-text-muted hover:text-accent-hover hover:bg-bg-surface transition-all cursor-pointer"
          aria-label={expandedId === item.id ? "Collapse" : "Expand sub-tasks"}
        >
          {expandedId === item.id ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </motion.button>
        {(item.subTasks ?? []).length > 0 && expandedId !== item.id && (
          <span className="text-xs text-accent-hover font-medium">[{(item.subTasks ?? []).length}]</span>
        )}
        {dragHandle}
        <motion.button
          type="button"
          whileHover={controlHover}
          whileTap={controlTap}
          onClick={() => handleDelete(item.id)}
          disabled={deleteItemMutation.isPending}
          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-all duration-200 disabled:opacity-50 cursor-pointer"
          aria-label={t("goalModal.deleteAria")}
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </motion.div>
      {expandedId === item.id && (
        <SubTaskSection
          subTasks={item.subTasks ?? []}
          showCheckbox
          onToggle={(subIdx) => toggleSubTask(item.id, subIdx)}
          onDelete={(subIdx) => deleteSubTask(item.id, subIdx)}
          onEditTitle={(subIdx, val) => editSubTask(item.id, subIdx, val)}
          onMove={(subIdx, dir) => moveSubTask(item.id, subIdx, dir)}
          newSubTaskTitle={newSubTaskTitle[item.id] ?? ""}
          onNewSubTaskTitleChange={(v) =>
            setNewSubTaskTitle((prev) => ({ ...prev, [item.id]: v }))
          }
          onAddSubTask={() => addSubTask(item.id, newSubTaskTitle[item.id] ?? "")}
        />
      )}
    </>
  );

  const periodSelector = (
    <PeriodSelector
      periodLabel={periodLabel}
      options={pickerOptions}
      currentPeriod={period}
      pickerOpen={pickerOpen}
      onTogglePicker={() => setPickerOpen((o) => !o)}
      onClosePicker={() => setPickerOpen(false)}
      onPrev={handlePrevPeriod}
      onNext={handleNextPeriod}
      onSelectPeriod={handleSelectPeriod}
    />
  );

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={handleClose}
      contentRef={contentRef}
      zBackdrop="z-40"
      zContent="z-50"
    >
      <div className="flex items-center justify-between p-6 border-b border-border-default">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent-primary/10">
            <Target className="w-5 h-5 text-accent-hover" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              {t("goalModal.title")}
            </h2>
            {periodSelector}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClose}
            className="p-2 rounded-xl text-text-tertiary hover:text-white hover:bg-bg-surface transition-all duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        {(["week", "month", "year"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab
                ? "text-accent-hover border-b-2 border-accent-primary bg-accent-primary/5"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab === "week"
              ? t("goalModal.tabWeek")
              : tab === "month"
                ? t("goalModal.tabMonth")
                : t("goalModal.tabYear")}
          </button>
        ))}
      </div>

      <ItemAddInput
        value={newTitle}
        onChange={setNewTitle}
        onAdd={handleAdd}
        placeholder={t("goalModal.addPlaceholder")}
        addLabel={t("goalModal.add")}
        disabled={!newTitle.trim() || patchMutation.isPending}
      />

      {/* List */}
      <div className="p-4 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-bg-surface animate-pulse" />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted">
            <Circle className="w-10 h-10 mb-2 opacity-30" />
            <p>{t("goalModal.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Reorder.Group axis="y" values={incomplete} onReorder={reorderIncomplete} className="space-y-2">
              {incomplete.map((item) => (
                <ReorderItem key={item.id} item={item} isMobile={isMobile}>
                  {(dragHandle) => renderGoalItem(item, dragHandle)}
                </ReorderItem>
              ))}
            </Reorder.Group>
            <Reorder.Group axis="y" values={completed} onReorder={reorderCompleted} className="space-y-2">
              {completed.map((item) => (
                <ReorderItem key={item.id} item={item} isMobile={isMobile}>
                  {(dragHandle) => renderGoalItem(item, dragHandle)}
                </ReorderItem>
              ))}
            </Reorder.Group>
          </div>
        )}
      </div>
    </ModalContainer>
  );
}
