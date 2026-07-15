import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Plus, Circle, TrendingUp } from "lucide-react";
import type { DayTodo, DayTodoItem, DayReflectionMeta } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useSubTaskManager } from "@/hooks/useSubTaskManager";
import { generateId } from "@/lib/generateId";
import { parseTarget } from "@/lib/parseTarget";
import { addClientIds, removeClientIds } from "@/lib/itemIds";
import { sortItemsByCompletion, regroupByCompletion } from "@/lib/sortItems";
import { ReorderItem } from "@/components/shared/ReorderItem";
import { DayTodoItem as DayTodoItemRow } from "@/components/DayTodoItem";
import type { DayTodoItemView as DayTodoItemWithId } from "@/components/DayTodoItem";
import { DayReflectionPanel } from "@/components/DayReflectionPanel";

const addIdsToItems = (items: DayTodoItem[]): DayTodoItemWithId[] =>
  addClientIds(items, "item") as DayTodoItemWithId[];

const removeIdsFromItems = (items: DayTodoItemWithId[]): DayTodoItem[] =>
  removeClientIds(items);

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
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const { editingId, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit } = useInlineEdit<string>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<string, string>>({});
  const reorderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const REORDER_DEBOUNCE_MS = 600;
  const COUNTER_DEBOUNCE_MS = 600;

  // Sync items from props
  useEffect(() => {
    const rawItems = dayTodo?.items ?? [];
    setItems(sortItemsByCompletion(addIdsToItems(rawItems)));
  }, [dayTodo]);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const addButtonHover = isMobile ? undefined : { scale: 1.02 };
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
    if (pendingToggle) return;
    setPendingToggle(id);

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
    setItems(toggled);

    setTimeout(() => {
      const reordered = regroupByCompletion(toggled);
      setItems(reordered);
      onUpdateItems(removeIdsFromItems(reordered));
      setPendingToggle(null);
    }, 400);
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
    // Regroup only shifts an item between the incomplete/complete sections when
    // its completion actually flips (at the last tap or on reset).
    const reordered = regroupByCompletion(updated);
    setItems(reordered);
    if (counterDebounceRef.current) clearTimeout(counterDebounceRef.current);
    counterDebounceRef.current = setTimeout(() => {
      onUpdateItems(removeIdsFromItems(reordered));
      counterDebounceRef.current = null;
    }, COUNTER_DEBOUNCE_MS);
  };

  const handleSubTasksChange = (next: DayTodoItemWithId[]) => {
    setItems(next);
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
        <div className="relative rounded-3xl bg-bg-card border border-border-default p-6">
          <div className="h-8 w-48 bg-bg-surface rounded-lg animate-pulse mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-bg-surface animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative rounded-3xl bg-bg-card border border-border-default overflow-hidden">
        {/* Header with Stats */}
        <div className="p-6 pb-4 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent-primary/10">
                <TrendingUp className="w-5 h-5 text-accent-hover" />
              </div>
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
                <motion.span 
                  key={progressPercent}
                  initial={isMobile ? { opacity: 0 } : { scale: 1.2, opacity: 0 }}
                  animate={isMobile ? { opacity: 1 } : { scale: 1, opacity: 1 }}
                  transition={
                    isMobile ? { duration: 0.16, ease: "easeOut" } : undefined
                  }
                  className="text-2xl font-bold text-accent-hover"
                >
                  {progressPercent}%
                </motion.span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="relative h-2 bg-bg-surface rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-accent-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{
                  duration: isMobile ? 0.25 : 0.5,
                  ease: "easeOut",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>
          )}
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
              whileHover={addButtonHover}
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
        <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
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
                        pendingToggle={pendingToggle}
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
