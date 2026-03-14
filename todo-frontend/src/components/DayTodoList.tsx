import { forwardRef, useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { Plus, Trash2, Check, Circle, TrendingUp, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import type { DayTodo, DayTodoItem } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { generateId } from "@/lib/generateId";
import { SubTaskSection } from "@/components/shared/SubTaskSection";

// Extend DayTodoItem với unique ID
interface DayTodoItemWithId extends DayTodoItem {
  id: string;
}


// Add ID to items if not exists; normalize subTasks array
const addIdsToItems = (items: DayTodoItem[]): DayTodoItemWithId[] => {
  return items.map((item, index) => ({
    ...item,
    id: `item-${index}-${item.title.slice(0, 10)}`,
    subTasks: item.subTasks ?? [],
  }));
};

// Remove ID before sending to API
const removeIdsFromItems = (items: DayTodoItemWithId[]): DayTodoItem[] => {
  return items.map(({ id, ...rest }) => rest);
};

interface DayTodoListProps {
  dayTodo: DayTodo | null;
  isLoading: boolean;
  onUpdateItems: (items: DayTodoItem[]) => void;
}

interface DayTodoReorderItemProps {
  item: DayTodoItemWithId;
  isMobile: boolean;
  children: (dragHandle: ReactNode) => ReactNode;
}

const DayTodoReorderItem = forwardRef<HTMLLIElement, DayTodoReorderItemProps>(
  ({ item, isMobile, children }, ref) => {
    const dragControls = useDragControls();

    const dragHandle = (
      <button
        type="button"
        onPointerDown={(e) => dragControls.start(e)}
        className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-linear-surface transition-all duration-200 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Reorder item"
      >
        <GripVertical className="w-4 h-4" />
      </button>
    );

    return (
      <Reorder.Item
        ref={ref}
        value={item}
        initial={{ opacity: 0, y: isMobile ? -8 : -20 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: isMobile
            ? { duration: 0.16, ease: "easeOut" }
            : {
                type: "spring",
                stiffness: 100,
                damping: 25,
              },
        }}
        exit={{
          opacity: 0,
          x: isMobile ? -40 : -100,
          transition: { duration: isMobile ? 0.12 : 0.2 },
        }}
        layout
        layoutId={item.id}
        dragListener={false}
        dragControls={dragControls}
        className="group"
      >
        {children(dragHandle)}
      </Reorder.Item>
    );
  }
);

DayTodoReorderItem.displayName = "DayTodoReorderItem";

export function DayTodoList({
  dayTodo,
  isLoading,
  onUpdateItems,
}: DayTodoListProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [newTitle, setNewTitle] = useState("");
  const [items, setItems] = useState<DayTodoItemWithId[]>([]);
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<string, string>>({});
  const editInputRef = useRef<HTMLInputElement>(null);
  const reorderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const REORDER_DEBOUNCE_MS = 600;

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  // Sync items from props
  useEffect(() => {
    const rawItems = dayTodo?.items ?? [];
    const itemsWithIds = addIdsToItems(rawItems);
    
    // Sort: incomplete first, completed last
    const sorted = [...itemsWithIds].sort((a, b) => {
      if (a.completed === b.completed) {
        return a.order - b.order;
      }
      return a.completed ? 1 : -1;
    });
    
    setItems(sorted);
  }, [dayTodo]);

  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const controlHover = isMobile ? undefined : { scale: 1.1 };
  const controlTap = isMobile ? { scale: 0.96 } : { scale: 0.9 };
  const addButtonHover = isMobile ? undefined : { scale: 1.02 };
  const addButtonTap = isMobile ? { scale: 0.99 } : { scale: 0.98 };
  const checkboxHover = isMobile ? undefined : { scale: 1.15 };

  const handleAdd = () => {
    const t = newTitle.trim();
    if (!t) return;
    
    const newItem: DayTodoItemWithId = {
      id: generateId(),
      title: t,
      completed: false,
      order: items.length,
      subTasks: [],
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
      const incomplete = toggled.filter((it) => !it.completed);
      const completed = toggled.filter((it) => it.completed);
      const reordered = [
        ...incomplete.map((it, idx) => ({ ...it, order: idx })),
        ...completed.map((it, idx) => ({ ...it, order: incomplete.length + idx })),
      ];
      setItems(reordered);
      onUpdateItems(removeIdsFromItems(reordered));
      setPendingToggle(null);
    }, 400);
  };

  const addSubTask = (itemId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const updated = items.map((item) => {
      if (item.id !== itemId) return item;
      const subTasks = item.subTasks ?? [];
      return {
        ...item,
        subTasks: [...subTasks, { title: trimmed, completed: false }],
      };
    });
    setItems(updated);
    onUpdateItems(removeIdsFromItems(updated));
    setNewSubTaskTitle((prev) => ({ ...prev, [itemId]: "" }));
  };

  const toggleSubTask = (itemId: string, subIndex: number) => {
    const updated = items.map((item) => {
      if (item.id !== itemId) return item;
      const subTasks = (item.subTasks ?? []).map((st, i) =>
        i === subIndex ? { ...st, completed: !st.completed } : st
      );
      const allCompleted = subTasks.length > 0 && subTasks.every((st) => st.completed);
      return {
        ...item,
        subTasks,
        completed: allCompleted ? true : item.completed,
      };
    });
    setItems(updated);
    onUpdateItems(removeIdsFromItems(updated));
  };

  const deleteSubTask = (itemId: string, subIndex: number) => {
    const updated = items.map((item) => {
      if (item.id !== itemId) return item;
      const subTasks = (item.subTasks ?? []).filter((_, i) => i !== subIndex);
      return { ...item, subTasks };
    });
    setItems(updated);
    onUpdateItems(removeIdsFromItems(updated));
  };

  const handleDelete = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    const reordered = filtered.map((it, idx) => ({ ...it, order: idx }));
    
    setItems(reordered);
    onUpdateItems(removeIdsFromItems(reordered));
  };

  const handleTitleClick = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      setEditingId(id);
      setEditValue(item.title);
    }
  };

  const saveTitle = (id: string) => {
    const trimmed = editValue.trim();
    setEditingId(null);
    setEditValue("");
    if (trimmed === "") return;
    const updated = items.map((it) =>
      it.id === id ? { ...it, title: trimmed } : it
    );
    setItems(updated);
    onUpdateItems(removeIdsFromItems(updated));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
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
    };
  }, []);

  if (isLoading) {
    return (
      <div className="relative">
        <div className="relative rounded-3xl bg-linear-card border border-white/[0.06] p-6">
          <div className="h-8 w-48 bg-linear-surface rounded-lg animate-pulse mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-linear-surface animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative rounded-3xl bg-linear-card border border-white/[0.06] overflow-hidden">
        {/* Header with Stats */}
        <div className="p-6 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10">
                <TrendingUp className="w-5 h-5 text-[#7C85E0]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {t("dayTodo.title")}
                </h2>
                <p className="text-sm text-slate-500">
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
                  className="text-2xl font-bold text-[#7C85E0]"
                >
                  {progressPercent}%
                </motion.span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="relative h-2 bg-linear-surface rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-linear-accent rounded-full"
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
        <div className="p-4 border-b border-white/[0.04]">
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Plus className="w-5 h-5 text-slate-500 group-focus-within:text-linear-accent-hover transition-colors" />
              </div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder={t("dayTodo.addPlaceholder")}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-linear-surface border border-white/[0.04] text-slate-100 placeholder-slate-500 
                  focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/40 focus:border-[#5E6AD2]/50 
                  hover:border-white/[0.1] transition-all duration-200"
              />
            </div>
            <motion.button
              type="button"
              whileHover={addButtonHover}
              whileTap={addButtonTap}
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="px-5 py-3.5 rounded-xl bg-linear-accent hover:bg-linear-accent-hover 
                text-white font-semibold transition-all duration-200 shadow-lg shadow-[#5E6AD2]/20
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-linear-accent cursor-pointer"
            >
              {t("dayTodo.add")}
            </motion.button>
          </div>
        </div>

        {/* Todo List with Reorder */}
        <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
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
                  <DayTodoReorderItem key={item.id} item={item} isMobile={isMobile}>
                    {(dragHandle) => (
                      <>
                    <motion.div 
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors duration-200 ${
                        item.completed 
                          ? 'bg-[#5E6AD2]/5 border-[#5E6AD2]/20' 
                          : 'bg-linear-surface border-white/[0.04] hover:bg-linear-surface/80 hover:border-white/[0.08]'
                      }`}
                      animate={{
                        scale: pendingToggle === item.id ? 0.98 : 1,
                      }}
                      transition={{
                        duration: isMobile ? 0.1 : 0.15,
                        ease: "easeOut",
                      }}
                    >
                      {/* Checkbox */}
                      <motion.button
                        type="button"
                        whileHover={checkboxHover}
                        whileTap={controlTap}
                        onClick={() => handleToggle(item.id)}
                        disabled={pendingToggle !== null}
                        className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          item.completed
                            ? 'bg-linear-accent border-linear-accent'
                            : 'border-slate-500 hover:border-linear-accent-hover hover:bg-[#5E6AD2]/10'
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
                                  : {
                                      type: "spring",
                                      stiffness: 500,
                                      damping: 15,
                                    }
                              }
                            >
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      
                      {/* Title - inline edit */}
                      {editingId === item.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveTitle(item.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          onBlur={() => saveTitle(item.id)}
                          className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-slate-200 focus:ring-0"
                        />
                      ) : (
                        <motion.span
                          role="button"
                          tabIndex={0}
                          onClick={() => handleTitleClick(item.id)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleTitleClick(item.id)
                          }
                          className={`flex-1 transition-all duration-300 cursor-text ${
                            item.completed
                              ? "line-through text-slate-500"
                              : "text-slate-200"
                          }`}
                          animate={isMobile ? undefined : { x: item.completed ? 4 : 0 }}
                        >
                          {item.title}
                        </motion.span>
                      )}
                      
                      {/* Expand / Sub-tasks */}
                      <motion.button
                        type="button"
                        whileHover={controlHover}
                        whileTap={controlTap}
                        onClick={() =>
                          setExpandedId((prev) => (prev === item.id ? null : item.id))
                        }
                        className="p-2 rounded-lg text-slate-500 hover:text-linear-accent-hover hover:bg-linear-surface transition-all duration-200 cursor-pointer"
                        aria-label={
                          expandedId === item.id ? "Collapse" : "Expand sub-tasks"
                        }
                      >
                        {expandedId === item.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </motion.button>
                      {(item.subTasks ?? []).length > 0 && expandedId !== item.id && (
                        <span className="text-xs text-[#7C85E0] font-medium">[{(item.subTasks ?? []).length}]</span>
                      )}
                      {dragHandle}
                      {/* Delete Button - always visible */}
                      <motion.button
                        type="button"
                        whileHover={controlHover}
                        whileTap={controlTap}
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                        aria-label={t("dayTodo.deleteAria")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                    {expandedId === item.id && (
                      <div className="pl-12 mt-1">
                        <SubTaskSection
                          subTasks={item.subTasks ?? []}
                          showCheckbox={true}
                          onToggle={(subIdx) => toggleSubTask(item.id, subIdx)}
                          onDelete={(subIdx) => deleteSubTask(item.id, subIdx)}
                          newSubTaskTitle={newSubTaskTitle[item.id] ?? ""}
                          onNewSubTaskTitleChange={(val) =>
                            setNewSubTaskTitle((prev) => ({ ...prev, [item.id]: val }))
                          }
                          onAddSubTask={() => addSubTask(item.id, newSubTaskTitle[item.id] ?? "")}
                        />
                      </div>
                    )}
                      </>
                    )}
                  </DayTodoReorderItem>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}
        </div>
      </div>
    </div>
  );
}
