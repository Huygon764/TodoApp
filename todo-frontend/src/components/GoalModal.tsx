import { useState, useRef, useEffect, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, Trash2, Check, Circle } from "lucide-react";
import { GoalsIcon } from "@/components/icons/GoalsIcon";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ItemAddInput } from "@/components/shared/ItemAddInput";
import { ReorderItem } from "@/components/shared/ReorderItem";
import { SubTaskSection } from "@/components/shared/SubTaskSection";
import { SubTaskToggle } from "@/components/shared/SubTaskToggle";
import { CounterChip } from "@/components/shared/CounterChip";
import { LinkifiedText } from "@/components/shared/LinkifiedText";
import { parseTarget } from "@/lib/parseTarget";
import { PeriodSelector } from "@/components/shared/PeriodSelector";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useModalClose } from "@/hooks/useModalClose";
import { useSubTaskManager } from "@/hooks/useSubTaskManager";
import { addClientIds, removeClientIds } from "@/lib/itemIds";
import { sortItemsByCompletion } from "@/lib/sortItems";
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
import { shouldIgnoreGoalReorder, shouldPersistGoalItemsOnClose } from "@/lib/goalDraft";
import { ListSkeleton } from "@/components/shared/ListSkeleton";
import { LIFE_GOAL_PERIOD, type GoalType } from "@/constants/goals";
import type { Goal, GoalItem } from "@/types";

export type GoalPeriodType = GoalType;

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GoalItemWithId = GoalItem & { id: string };

type GoalMutationVars = {
  goalId?: string;
  type: GoalPeriodType;
  period: string;
  items: GoalItem[];
};

function addIdsToItems(
  items: GoalItem[],
  tab: GoalPeriodType,
): GoalItemWithId[] {
  return addClientIds(items, `goal-item-${tab}`, 8) as GoalItemWithId[];
}

function removeIdsFromItems(
  items: (GoalItem & { id: string })[]
): GoalItem[] {
  return removeClientIds(items);
}

export function GoalModal({ isOpen, onClose }: GoalModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const controlTap = isMobile ? { scale: 0.96 } : { scale: 0.9 };
  const [activeTab, setActiveTab] = useState<GoalPeriodType>("week");
  const [selectedWeekPeriod, setSelectedWeekPeriod] = useState(getWeekPeriod());
  const [selectedMonthPeriod, setSelectedMonthPeriod] = useState(getMonthPeriod());
  const [selectedYearPeriod, setSelectedYearPeriod] = useState(getYearPeriod());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [localItems, setLocalItems] = useState<GoalItemWithId[]>([]);
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
        : activeTab === "year"
          ? selectedYearPeriod
          : LIFE_GOAL_PERIOD;
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

  // Reload when the modal opens or the tab/period changes. Do not depend on
  // `goal`: optimistic cache writes would reset localItems and kill the
  // completed-to-bottom layout animation.
  useLayoutEffect(() => {
    if (!isOpen || isLoading) return;
    setExpandedId(null);
    if (goal != null) {
      const next = sortItemsByCompletion(
        addIdsToItems(goal.items ?? [], activeTab),
      );
      setLocalItems(next);
      initialOrderRef.current = next.map((i) => i.id).join(",");
    } else {
      setLocalItems([]);
      initialOrderRef.current = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see comment above
  }, [isOpen, isLoading, activeTab, period]);

  const sortedItems = localItems;

  const patchMutation = useMutation({
    mutationFn: (vars: GoalMutationVars) =>
      vars.goalId
        ? apiPatch<{ goal: Goal }>(API_PATHS.GOAL(vars.goalId), {
            items: vars.items,
          })
        : apiPost<{ goal: Goal }>(API_PATHS.GOALS, {
            type: vars.type,
            period: vars.period,
            items: vars.items,
          }),
    onMutate: async (vars) => {
      const key = ["goal", vars.type, vars.period] as const;
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Goal | null>(key);
      if (previous) {
        queryClient.setQueryData(key, { ...previous, items: vars.items });
      }
      return { previous, queryKey: key };
    },
    onError: (_err, vars, context) => {
      if (context?.previous != null) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
      if (
        vars.type === activeTab &&
        vars.period === period &&
        context?.previous != null
      ) {
        setLocalItems(
          sortItemsByCompletion(
            addIdsToItems(context.previous.items ?? [], vars.type),
          ),
        );
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["goal", vars.type, vars.period],
      });
    },
  });

  const persistItems = (
    local: GoalItemWithId[],
    serverItems?: GoalItem[],
  ) => {
    setLocalItems(local);
    const vars: GoalMutationVars = {
      type: activeTab,
      period,
      items: serverItems ?? removeIdsFromItems(local),
    };
    if (goal?._id) vars.goalId = goal._id;
    patchMutation.mutate(vars);
  };

  const handleCloseRef = useRef<() => void>(onClose);
  useModalClose(isOpen, () => handleCloseRef.current(), contentRef);

  const stepActivePeriod = (direction: "prev" | "next") => {
    if (activeTab === "week") {
      setSelectedWeekPeriod((p) => stepPeriod("week", p, direction));
    } else if (activeTab === "month") {
      setSelectedMonthPeriod((p) => stepPeriod("month", p, direction));
    } else if (activeTab === "year") {
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
      ? formatWeekPeriodLabel(period)
      : activeTab === "month"
        ? formatMonthLabel(period)
        : t("goalModal.yearLabel", { period });

  const handleAdd = () => {
    const raw = newTitle.trim();
    if (!raw) return;
    const { title, target } = parseTarget(raw);
    const newItems = removeIdsFromItems(sortedItems).concat({
      title,
      completed: false,
      order: sortedItems.length,
      ...(target ? { target, count: 0 } : {}),
    });
    persistItems(
      sortItemsByCompletion(addIdsToItems(newItems, activeTab)),
      newItems,
    );
    setNewTitle("");
  };

  const handleToggle = (id: string) => {
    const toggled = sortedItems.map((item) => {
      if (item.id !== id) return item;
      const nextCompleted = !item.completed;
      if (item.target != null) {
        return {
          ...item,
          completed: nextCompleted,
          count: nextCompleted ? item.target : 0,
        };
      }
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
    const reordered = sortItemsByCompletion(toggled);
    persistItems(reordered, removeIdsFromItems(toggled));
  };

  const handleCounterIncrement = (id: string) => {
    const updated = sortedItems.map((item) => {
      if (item.id !== id || item.target == null) return item;
      const target = item.target;
      const current = item.count ?? 0;
      const next = current >= target ? 0 : current + 1;
      return { ...item, count: next, completed: next >= target };
    });
    const reordered = sortItemsByCompletion(updated);
    persistItems(reordered, removeIdsFromItems(updated));
  };

  const subTaskManager = useSubTaskManager(localItems, persistItems);

  const addSubTask = (itemId: string, title: string) => {
    subTaskManager.addSubTask(itemId, title);
    setNewSubTaskTitle((prev) => ({ ...prev, [itemId]: "" }));
  };
  const toggleSubTask = subTaskManager.toggleSubTask;
  const incrementSubTask = subTaskManager.incrementSubTask;
  const deleteSubTask = subTaskManager.deleteSubTask;
  const editSubTask = subTaskManager.editSubTask;
  const moveSubTask = subTaskManager.moveSubTask;

  const handleDelete = (clientId: string) => {
    if (!goal) return;
    const filtered = sortedItems
      .filter((it) => it.id !== clientId)
      .map((it, i) => ({ ...it, order: i }));
    persistItems(filtered);
  };

  const handleSelectPeriod = (p: string) => {
    if (activeTab === "week") setSelectedWeekPeriod(p);
    else if (activeTab === "month") setSelectedMonthPeriod(p);
    else if (activeTab === "year") setSelectedYearPeriod(p);
    setPickerOpen(false);
  };

  const handleReorder = (newOrder: GoalItemWithId[]) => {
    if (shouldIgnoreGoalReorder(newOrder, sortedItems)) return;
    setLocalItems(newOrder.map((it, idx) => ({ ...it, order: idx })));
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
    if (goal) persistItems(updated);
    else setLocalItems(updated);
  };

  const handleClose = () => {
    const currentOrder = localItems.map((i) => i.id).join(",");
    const shouldSave = shouldPersistGoalItemsOnClose({
      hasGoal: goal != null,
      localCount: localItems.length,
      serverCount: goal?.items.length ?? 0,
      currentOrder,
      initialOrder: initialOrderRef.current,
    });
    if (shouldSave) {
      const payload = [...localItems]
        .sort((a, b) => a.order - b.order)
        .map((it, idx) => ({ ...it, order: idx }));
      const vars: GoalMutationVars = {
        type: activeTab,
        period,
        items: removeIdsFromItems(payload),
      };
      if (goal?._id) vars.goalId = goal._id;
      onClose();
      patchMutation.mutate(vars);
    } else {
      onClose();
    }
  };
  handleCloseRef.current = handleClose;

  const renderGoalItem = (item: GoalItemWithId, dragHandle: ReactNode) => (
    <>
      <motion.div
        className={`flex items-center gap-4 p-3 rounded-xl border transition-colors duration-200 ${
          item.completed
            ? "bg-accent-primary/5 border-accent-primary/20"
            : "bg-bg-surface border-border-subtle hover:bg-bg-surface/80"
        }`}
      >
        <motion.button
          type="button"
          whileTap={controlTap}
          onClick={() => handleToggle(item.id)}
          aria-label={item.title}
          aria-pressed={item.completed}
          className={`shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
            item.completed
              ? "bg-accent-primary border-accent-primary"
              : "border-text-muted hover:border-accent-hover hover:bg-accent-primary/10"
          }`}
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
            className={`flex-1 min-w-0 break-words [overflow-wrap:anywhere] cursor-text ${
              item.completed ? "line-through text-text-tertiary" : "text-text-secondary"
            }`}
          >
            <LinkifiedText text={item.title} />
          </span>
        )}
        {item.target != null ? (
          <CounterChip
            count={item.count ?? 0}
            target={item.target}
            isMobile={isMobile}
            onIncrement={() => handleCounterIncrement(item.id)}
          />
        ) : (
          <SubTaskToggle
            count={(item.subTasks ?? []).length}
            expanded={expandedId === item.id}
            isMobile={isMobile}
            onClick={() => setExpandedId((prev) => (prev === item.id ? null : item.id))}
          />
        )}
        {dragHandle}
        <motion.button
          type="button"
          whileTap={controlTap}
          onClick={() => handleDelete(item.id)}
          disabled={patchMutation.isPending}
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
          onIncrement={(subIdx) => incrementSubTask(item.id, subIdx)}
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
          <GoalsIcon className="w-5 h-5 text-accent-hover" />
          <div>
            <h2 className="text-xl font-semibold text-white">
              {t("goalModal.title")}
            </h2>
            {activeTab === "life" ? (
              <p className="text-sm text-text-muted">{t("goalModal.lifeHint")}</p>
            ) : (
              periodSelector
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            type="button"
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
        {(["week", "month", "year", "life"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setPickerOpen(false);
              setActiveTab(tab);
            }}
            className={`flex-1 min-w-0 py-3 px-1 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab
                ? "text-accent-hover border-b-2 border-accent-primary bg-accent-primary/5"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab === "week"
              ? t("goalModal.tabWeek")
              : tab === "month"
                ? t("goalModal.tabMonth")
                : tab === "year"
                  ? t("goalModal.tabYear")
                  : t("goalModal.tabLife")}
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
          <ListSkeleton />
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted">
            <Circle className="w-10 h-10 mb-2 opacity-30" />
            <p>{t("goalModal.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Reorder.Group
              key={`${activeTab}-${period}`}
              axis="y"
              values={sortedItems}
              onReorder={handleReorder}
              className="space-y-2"
            >
              <AnimatePresence initial={false} mode="popLayout">
                {sortedItems.map((item) => (
                  <ReorderItem key={item.id} item={item} isMobile={isMobile} layoutId={item.id}>
                    {(dragHandle) => renderGoalItem(item, dragHandle)}
                  </ReorderItem>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </div>
        )}
      </div>
    </ModalContainer>
  );
}
