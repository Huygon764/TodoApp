import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { X, Plus, Trash2, Check, Circle, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPatch } from "@/lib/api";
import type { FreetimeTodo, FreetimeTodoItem, FreetimeSubTask } from "@/types";

interface FreetimeTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FreetimeTodoItemWithId extends FreetimeTodoItem {
  id: string;
  subTasks: FreetimeSubTask[];
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const addIdsToItems = (items: FreetimeTodoItem[]): FreetimeTodoItemWithId[] =>
  items.map((item, index) => ({
    ...item,
    id: `freetime-${index}-${item.title.slice(0, 10)}`,
    subTasks: item.subTasks ?? [],
  }));

const removeIdsFromItems = (items: FreetimeTodoItemWithId[]): FreetimeTodoItem[] =>
  items.map(({ id, ...rest }) => rest);

interface FreetimeReorderItemProps {
  item: FreetimeTodoItemWithId;
  children: (dragHandle: ReactNode) => ReactNode;
}

function FreetimeReorderItem({ item, children }: FreetimeReorderItemProps) {
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
      value={item}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      layout
      dragListener={false}
      dragControls={dragControls}
      className="group"
    >
      {children(dragHandle)}
    </Reorder.Item>
  );
}

export function FreetimeTodoModal({ isOpen, onClose }: FreetimeTodoModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<FreetimeTodoItemWithId[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<string, string>>({});

  const REORDER_DEBOUNCE_MS = 600;
  const reorderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const queryKey = ["freetime-todo"];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ freetimeTodo: FreetimeTodo }>(API_PATHS.FREETIME_TODO);
      return res.data?.freetimeTodo ?? null;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    const rawItems = data?.items ?? [];
    const withIds = addIdsToItems(rawItems);
    const sorted = [...withIds].sort((a, b) => {
      if (a.completed === b.completed) return a.order - b.order;
      return a.completed ? 1 : -1;
    });
    setItems(sorted);
  }, [isOpen, data]);

  const patchMutation = useMutation({
    mutationFn: (payload: { items: FreetimeTodoItem[] }) =>
      apiPatch<{ freetimeTodo: FreetimeTodo }>(API_PATHS.FREETIME_TODO, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const syncItems = (next: FreetimeTodoItemWithId[], debounce = false) => {
    setItems(next);
    const withoutIds = removeIdsFromItems(next);

    if (debounce) {
      if (reorderDebounceRef.current) clearTimeout(reorderDebounceRef.current);
      reorderDebounceRef.current = setTimeout(() => {
        patchMutation.mutate({ items: withoutIds });
        reorderDebounceRef.current = null;
      }, REORDER_DEBOUNCE_MS);
    } else {
      patchMutation.mutate({ items: withoutIds });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (reorderDebounceRef.current) clearTimeout(reorderDebounceRef.current);
    };
  }, []);

  const handleAdd = () => {
    const tVal = newTitle.trim();
    if (!tVal) return;
    const newItem: FreetimeTodoItemWithId = {
      id: generateId(),
      title: tVal,
      completed: false,
      order: items.length,
      subTasks: [],
    };
    const next = [...items, newItem];
    syncItems(next);
    setNewTitle("");
  };

  const handleToggle = (id: string) => {
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
    // keep order grouping incomplete/completed
    const incomplete = toggled.filter((it) => !it.completed);
    const completed = toggled.filter((it) => it.completed);
    const reordered = [
      ...incomplete.map((it, idx) => ({ ...it, order: idx })),
      ...completed.map((it, idx) => ({ ...it, order: incomplete.length + idx })),
    ];
    syncItems(reordered);
  };

  const handleDelete = (id: string) => {
    const filtered = items.filter((it) => it.id !== id);
    const reordered = filtered.map((it, idx) => ({ ...it, order: idx }));
    syncItems(reordered);
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
    if (!trimmed) return;
    const updated = items.map((it) =>
      it.id === id ? { ...it, title: trimmed } : it
    );
    syncItems(updated);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const addSubTask = (itemId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const updated = items.map((item) => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        subTasks: [...(item.subTasks ?? []), { title: trimmed, completed: false }],
      };
    });
    syncItems(updated);
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
    syncItems(updated);
  };

  const deleteSubTask = (itemId: string, subIndex: number) => {
    const updated = items.map((item) => {
      if (item.id !== itemId) return item;
      const subTasks = (item.subTasks ?? []).filter((_, i) => i !== subIndex);
      return { ...item, subTasks };
    });
    syncItems(updated);
  };

  const handleReorder = (newOrder: FreetimeTodoItemWithId[]) => {
    const reordered = newOrder.map((it, idx) => ({ ...it, order: idx }));
    syncItems(reordered, true);
  };

  const completedCount = items.filter((it) => it.completed).length;
  const totalCount = items.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-xl" ref={contentRef}>
              <div className="relative rounded-3xl bg-linear-card border border-white/[0.06] shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10">
                      <Circle className="w-5 h-5 text-[#7C85E0]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {t("freetimeModal.title", "Freetime list")}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {t(
                          "freetimeModal.subtitle",
                          "Things you want to do when you have time"
                        )}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-linear-surface transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="p-4 border-b border-white/4">
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
                        placeholder={t(
                          "freetimeModal.addPlaceholder",
                          "Add something to do in your freetime..."
                        )}
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-linear-surface border border-white/[0.04] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/40 focus:border-[#5E6AD2]/50 hover:border-white/[0.1] transition-all duration-200"
                      />
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAdd}
                      disabled={!newTitle.trim()}
                      className="px-5 py-3.5 rounded-xl bg-linear-accent hover:bg-linear-accent-hover text-white font-semibold transition-all duration-200 shadow-lg shadow-[#5E6AD2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("freetimeModal.add", "Add")}
                    </motion.button>
                  </div>
                </div>

                <div className="px-6 pt-4">
                  {totalCount > 0 && (
                    <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
                      <span>
                        {t("dayTodo.completedCount", {
                          done: completedCount,
                          total: totalCount,
                        })}
                      </span>
                      <span>{progressPercent}%</span>
                    </div>
                  )}
                  {totalCount > 0 && (
                    <div className="relative h-1.5 bg-linear-surface rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-linear-accent rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 pt-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                      <Circle className="w-10 h-10 mb-3 animate-spin opacity-40" />
                      <p className="text-sm">Loading freetime tasks...</p>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                      <Circle className="w-10 h-10 mb-3 opacity-30" />
                      <p>
                        {t("freetimeModal.emptyTitle", "No freetime tasks yet")}
                      </p>
                      <p className="text-sm">
                        {t(
                          "freetimeModal.emptySub",
                          "Add ideas for things you want to do when you have time"
                        )}
                      </p>
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
                          <FreetimeReorderItem key={item.id} item={item}>
                            {(dragHandle) => (
                              <>
                            <motion.div
                              className={`flex items-center gap-4 p-3.5 rounded-xl border transition-colors duration-200 ${
                                item.completed
                                  ? "bg-[#5E6AD2]/5 border-[#5E6AD2]/20"
                                  : "bg-linear-surface border-white/[0.04] hover:bg-linear-surface/80 hover:border-white/[0.1]"
                              }`}
                            >
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleToggle(item.id)}
                                className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                  item.completed
                                    ? "bg-linear-accent border-linear-accent"
                                    : "border-slate-500 hover:border-linear-accent-hover hover:bg-[#5E6AD2]/10"
                                }`}
                              >
                                {item.completed && (
                                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                )}
                              </motion.button>

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
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleTitleClick(item.id)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && handleTitleClick(item.id)
                                  }
                                  className={`flex-1 cursor-text text-sm ${
                                    item.completed
                                      ? "line-through text-slate-500"
                                      : "text-slate-200"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              )}

                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() =>
                                  setExpandedId((prev) =>
                                    prev === item.id ? null : item.id
                                  )
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

                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDelete(item.id)}
                                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                                aria-label={t("freetimeModal.deleteAria", "Delete")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </motion.div>

                            {expandedId === item.id && (
                              <div className="pl-11 pr-4 pb-3 pt-1 space-y-1.5 mt-1">
                                {(item.subTasks ?? []).map((st, subIdx) => (
                                  <div
                                    key={subIdx}
                                    className="flex items-center gap-3 py-1.5 pl-3 rounded-lg bg-linear-surface border border-white/[0.04]"
                                  >
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => toggleSubTask(item.id, subIdx)}
                                      className="shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer border-slate-500 hover:border-linear-accent-hover hover:bg-[#5E6AD2]/10"
                                    >
                                      {st.completed && (
                                        <Check
                                          className="w-3.5 h-3.5 text-white"
                                          strokeWidth={3}
                                        />
                                      )}
                                    </motion.button>
                                    <span
                                      className={`flex-1 text-sm ${
                                        st.completed
                                          ? "line-through text-slate-500"
                                          : "text-slate-300"
                                      }`}
                                    >
                                      {st.title}
                                    </span>
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => deleteSubTask(item.id, subIdx)}
                                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                      aria-label={t(
                                        "freetimeModal.deleteSubTaskAria",
                                        "Delete sub-task"
                                      )}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </motion.button>
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={newSubTaskTitle[item.id] ?? ""}
                                    onChange={(e) =>
                                      setNewSubTaskTitle((prev) => ({
                                        ...prev,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        addSubTask(
                                          item.id,
                                          newSubTaskTitle[item.id] ?? ""
                                        );
                                      }
                                    }}
                                    placeholder={t(
                                      "freetimeModal.addSubTaskPlaceholder",
                                      "Add sub-task"
                                    )}
                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-linear-surface border border-white/[0.04] text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/40"
                                  />
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                      addSubTask(item.id, newSubTaskTitle[item.id] ?? "")
                                    }
                                    className="px-3 py-2 rounded-lg bg-[#5E6AD2]/20 text-[#7C85E0] text-sm font-medium hover:bg-[#5E6AD2]/30 cursor-pointer"
                                  >
                                    {t("freetimeModal.addSubTask", "Add")}
                                  </motion.button>
                                </div>
                              </div>
                            )}
                              </>
                            )}
                          </FreetimeReorderItem>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

