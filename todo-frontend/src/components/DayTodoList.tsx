import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Plus, Circle, TrendingUp } from "lucide-react";
import type { DayTodo, DayTodoItem, DayReflectionMeta } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { usePrimaryHover } from "@/hooks/usePrimaryHover";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useSubTaskManager } from "@/hooks/useSubTaskManager";
import { generateId } from "@/lib/generateId";
import { parseTarget } from "@/lib/parseTarget";
import { addClientIds, removeClientIds } from "@/lib/itemIds";
import { sortItemsByCompletion } from "@/lib/sortItems";
import { ReorderItem } from "@/components/shared/ReorderItem";
import { DayTodoItem as DayTodoItemRow } from "@/components/DayTodoItem";
import type { DayTodoItemView as DayTodoItemWithId } from "@/components/DayTodoItem";
import { DayReflectionPanel } from "@/components/DayReflectionPanel";
import { ListSkeleton } from "@/components/shared/ListSkeleton";

const addIdsToItems = (items: DayTodoItem[]): DayTodoItemWithId[] =>
  addClientIds(items, "item") as DayTodoItemWithId[];

const removeIdsFromItems = (items: DayTodoItemWithId[]): DayTodoItem[] =>
  removeClientIds(items);

/** Hug the items; cap height so a long list scrolls instead of stretching Home. */
const LIST_SCROLL_CLASS = "p-4 max-h-[400px] overflow-y-auto";

interface DayTodoListProps {
  dayTodo: DayTodo | null;
  isLoading: boolean;
  onUpdateItems: (items: DayTodoItem[]) => void;
  onUpdateMeta: (meta: DayReflectionMeta) => void;
}

export function DayTodoList({
  dayTodo,
  isLoading,
  onUpdateItems,
  onUpdateMeta,
}: DayTodoListProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [newTitle, setNewTitle] = useState("");
  const [items, setItems] = useState<DayTodoItemWithId[]>([]);
  const { editingId, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit } = useInlineEdit<string>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<string, string>>({});
  const reorderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const REORDER_DEBOUNCE_MS = 600;
  const COUNTER_DEBOUNCE_MS = 600;

  // Sync before paint so a loaded day never flashes the empty state.
  useLayoutEffect(() => {
    const rawItems = dayTodo?.items ?? [];
    setItems(sortItemsByCompletion(addIdsToItems(rawItems)));
  }, [dayTodo]);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const primaryHover = usePrimaryHover();
  const addButtonTap = isMobile ? { scale: 0.99 } : { scale: 0.98 };

  const handleAdd = () => {
    const raw = newTitle.trim();
    if (!raw) return;

    const { title, target } = parseTarget(raw);
    const newItem: DayTodoItemWithId = {
      id: generateId(),
      title,
      completed: false,
      order: items.length,
      subTasks: [],
      ...(target ? { target, count: 0 } : {}),
    };

    const newItems = [...items, newItem];
    setItems(newItems);
    onUpdateItems(removeIdsFromItems(newItems));
    setNewTitle("");
  };

  const handleToggle = (id: string) => {
    const toggled = items.map((item) => {
      if (item.id !== id) return item;
      const nextCompleted = !item.completed;
      // A counter item's checkbox fills or empties the count.
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
    setItems(reordered);
    onUpdateItems(removeIdsFromItems(toggled));
  };

  // A counter tap adds one (or resets a full counter to zero). The UI updates
  // immediately; persistence is debounced so rapid taps send one PATCH.
  const handleCounterIncrement = (id: string) => {
    const updated = items.map((item) => {
      if (item.id !== id || item.target == null) return item;
      const target = item.target;
      const current = item.count ?? 0;
      const next = current >= target ? 0 : current + 1;
      return { ...item, count: next, completed: next >= target };
    });
    // Sort completed to the bottom in the UI; persist the in-place toggle so
    // client ids stay stable and the row can layout-animate.
    const reordered = sortItemsByCompletion(updated);
    setItems(reordered);
    if (counterDebounceRef.current) clearTimeout(counterDebounceRef.current);
    counterDebounceRef.current = setTimeout(() => {
      onUpdateItems(removeIdsFromItems(updated));
      counterDebounceRef.current = null;
    }, COUNTER_DEBOUNCE_MS);
  };

  const handleSubTasksChange = (next: DayTodoItemWithId[]) => {
    setItems(sortItemsByCompletion(next));
    onUpdateItems(removeIdsFromItems(next));
  };

  const subTaskManager = useSubTaskManager(items, handleSubTasksChange);

  const addSubTask = (itemId: string, title: string) => {
    subTaskManager.addSubTask(itemId, title);
    setNewSubTaskTitle((prev) => ({ ...prev, [itemId]: "" }));
  };
  const toggleSubTask = subTaskManager.toggleSubTask;
  const incrementSubTask = subTaskManager.incrementSubTask;
  const deleteSubTask = subTaskManager.deleteSubTask;
  const editSubTask = subTaskManager.editSubTask;
  const moveSubTask = subTaskManager.moveSubTask;

  const handleDelete = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    const reordered = filtered.map((it, idx) => ({ ...it, order: idx }));
    
    setItems(reordered);
    onUpdateItems(removeIdsFromItems(reordered));
  };

  const handleTitleClick = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) startEdit(id, item.title);
  };

  const saveTitle = (id: string) => {
    const value = finishEdit();
    if (!value) return;
    const updated = items.map((it) =>
      it.id === id ? { ...it, title: value } : it
    );
    setItems(updated);
    onUpdateItems(removeIdsFromItems(updated));
  };

  const handleReorder = (newOrder: DayTodoItemWithId[]) => {
    const reordered = newOrder.map((it, idx) => ({ ...it, order: idx }));
    setItems(reordered);
    if (reorderDebounceRef.current) clearTimeout(reorderDebounceRef.current);
    reorderDebounceRef.current = setTimeout(() => {
      onUpdateItems(removeIdsFromItems(reordered));
      reorderDebounceRef.current = null;
    }, REORDER_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (reorderDebounceRef.current) clearTimeout(reorderDebounceRef.current);
      if (counterDebounceRef.current) clearTimeout(counterDebounceRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="relative">
        <div className="relative rounded-xl bg-bg-card border border-border-default overflow-hidden">
          <div className="p-6 pb-4 border-b border-border-subtle">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 rounded bg-bg-elevated animate-pulse" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-bg-elevated rounded-lg animate-pulse" />
                <div className="h-4 w-28 bg-bg-elevated rounded animate-pulse" />
              </div>
            </div>
            <div className="h-2 bg-bg-elevated rounded-full animate-pulse" />
          </div>
          <div className="p-4 border-b border-border-subtle">
            <div className="flex gap-3">
              <div className="flex-1 h-[50px] rounded-xl bg-bg-elevated animate-pulse" />
              <div className="w-20 h-[50px] rounded-xl bg-bg-elevated animate-pulse" />
            </div>
          </div>
          <div className={LIST_SCROLL_CLASS}>
            <ListSkeleton />
          </div>
          <div className="border-t border-border-subtle p-4">
            <div className="h-5 w-36 bg-bg-elevated rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative rounded-xl bg-bg-card border border-border-default overflow-hidden">
        {/* Header with Stats */}
        <div className="p-6 pb-4 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-accent-hover" />
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {t("dayTodo.title")}
                </h2>
                <p className="text-sm text-text-muted">
                  {t("dayTodo.completedCount", { done: completedCount, total: totalCount })}
                </p>
              </div>
            </div>
            {totalCount > 0 && (
              <div className="text-right">
                {isMobile ? (
                  <span className="text-2xl font-bold text-accent-hover">
                    {progressPercent}%
                  </span>
                ) : (
                  <motion.span
                    key={progressPercent}
                    initial={{ scale: 1.2, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-2xl font-bold text-accent-hover"
                  >
                    {progressPercent}%
                  </motion.span>
                )}
              </div>
            )}
          </div>

          <div className="relative h-2 bg-bg-surface rounded-full overflow-hidden">
            {totalCount > 0 && (
              <>
                {isMobile ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-accent-primary rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                ) : (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-accent-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </>
            )}
          </div>
        </div>

        {/* Add Input */}
        <div className="p-4 border-b border-border-subtle">
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Plus className="w-5 h-5 text-text-muted group-focus-within:text-accent-hover transition-colors" />
              </div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder={t("dayTodo.addPlaceholder")}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-bg-surface border border-border-subtle text-slate-100 placeholder-text-muted
                  focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:border-accent-primary/50
                  hover:border-border-strong transition-all duration-200"
              />
            </div>
            <motion.button
              type="button"
              whileHover={primaryHover}
              whileTap={addButtonTap}
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="px-5 py-3.5 rounded-xl bg-accent-primary hover:bg-accent-hover
                text-white font-semibold transition-all duration-200 shadow-lg shadow-accent-primary/20
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-accent-primary cursor-pointer"
            >
              {t("dayTodo.add")}
            </motion.button>
          </div>
        </div>

        {/* Todo List with Reorder */}
        <div className={LIST_SCROLL_CLASS}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-muted">
              <Circle className="w-12 h-12 mb-3 opacity-30" />
              <p>{t("dayTodo.emptyTitle")}</p>
              <p className="text-sm">{t("dayTodo.emptySub")}</p>
            </div>
          ) : (
            <Reorder.Group 
              axis="y" 
              values={items} 
              onReorder={handleReorder}
              className="space-y-2"
            >
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <ReorderItem key={item.id} item={item} isMobile={isMobile} layoutId={item.id}>
                    {(dragHandle) => (
                      <DayTodoItemRow
                        item={item}
                        isMobile={isMobile}
                        expanded={expandedId === item.id}
                        editing={editingId === item.id}
                        editValue={editValue}
                        editInputRef={editInputRef}
                        newSubTaskTitle={newSubTaskTitle[item.id] ?? ""}
                        dragHandle={dragHandle}
                        onToggle={handleToggle}
                        onCounterIncrement={handleCounterIncrement}
                        onTitleClick={handleTitleClick}
                        onTitleChange={setEditValue}
                        onTitleSave={saveTitle}
                        onTitleCancel={cancelEdit}
                        onToggleExpand={(id) =>
                          setExpandedId((prev) => (prev === id ? null : id))
                        }
                        onDelete={handleDelete}
                        onSubTaskAdd={(id) =>
                          addSubTask(id, newSubTaskTitle[id] ?? "")
                        }
                        onSubTaskToggle={toggleSubTask}
                        onSubTaskIncrement={incrementSubTask}
                        onSubTaskDelete={deleteSubTask}
                        onSubTaskEdit={editSubTask}
                        onSubTaskMove={moveSubTask}
                        onNewSubTaskTitleChange={(id, val) =>
                          setNewSubTaskTitle((prev) => ({ ...prev, [id]: val }))
                        }
                      />
                    )}
                  </ReorderItem>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>

        {/* Daily reflection: journal, mood/energy, gratitude, "on this day" */}
        {dayTodo && (
          <DayReflectionPanel dayTodo={dayTodo} onUpdateMeta={onUpdateMeta} />
        )}
      </div>
    </div>
  );
}
