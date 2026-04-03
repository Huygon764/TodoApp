import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Trash2, Check, Circle, ChevronDown, ChevronRight } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPatch } from "@/lib/api";
import type { FreetimeTodo, FreetimeTodoItem, FreetimeSubTask } from "@/types";
import { generateId } from "@/lib/generateId";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useModalClose } from "@/hooks/useModalClose";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { ItemAddInput } from "@/components/shared/ItemAddInput";
import { ReorderItem } from "@/components/shared/ReorderItem";
import { SubTaskSection } from "@/components/shared/SubTaskSection";

interface FreetimeTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FreetimeTodoItemWithId extends FreetimeTodoItem {
  id: string;
  subTasks: FreetimeSubTask[];
}


const addIdsToItems = (items: FreetimeTodoItem[]): FreetimeTodoItemWithId[] =>
  items.map((item, index) => ({
    ...item,
    id: `freetime-${index}-${item.title.slice(0, 10)}`,
    subTasks: item.subTasks ?? [],
  }));

const removeIdsFromItems = (items: FreetimeTodoItemWithId[]): FreetimeTodoItem[] =>
  items.map(({ id, ...rest }) => rest);

export function FreetimeTodoModal({ isOpen, onClose }: FreetimeTodoModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<FreetimeTodoItemWithId[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const { editingId, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit } = useInlineEdit<string>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<string, string>>({});

  const controlHover = isMobile ? undefined : { scale: 1.1 };
  const controlTap = isMobile ? { scale: 0.96 } : { scale: 0.9 };
  const checkboxHover = isMobile ? undefined : { scale: 1.15 };

  const REORDER_DEBOUNCE_MS = 600;
  const reorderDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useModalClose(isOpen, onClose, contentRef);

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
    if (item) startEdit(id, item.title);
  };

  const saveTitle = (id: string) => {
    const value = finishEdit();
    if (!value) return;
    const updated = items.map((it) =>
      it.id === id ? { ...it, title: value } : it
    );
    syncItems(updated);
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
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef} maxWidth="max-w-xl">
                <ModalHeader
                  icon={<Circle className="w-5 h-5 text-accent-hover" />}
                  title={t("freetimeModal.title", "Freetime list")}
                  subtitle={t("freetimeModal.subtitle", "Things you want to do when you have time")}
                  onClose={onClose}
                />

                <ItemAddInput
                  value={newTitle}
                  onChange={setNewTitle}
                  onAdd={handleAdd}
                  placeholder={t("freetimeModal.addPlaceholder", "Add something to do in your freetime...")}
                  addLabel={t("freetimeModal.add", "Add")}
                />

                <div className="px-6 pt-4">
                  {totalCount > 0 && (
                    <div className="flex items-center justify-between mb-3 text-xs text-text-muted">
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
                    <div className="relative h-1.5 bg-bg-surface rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-accent-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 pt-2 min-h-[200px] max-h-[400px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                      <Circle className="w-10 h-10 mb-3 animate-spin opacity-40" />
                      <p className="text-sm">Loading freetime tasks...</p>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-text-muted">
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
                          <ReorderItem key={item.id} item={item} isMobile={isMobile}>
                            {(dragHandle) => (
                              <>
                            <motion.div
                              className={`flex items-center gap-4 p-3.5 rounded-xl border transition-colors duration-200 ${
                                item.completed
                                  ? "bg-accent-primary/5 border-accent-primary/20"
                                  : "bg-bg-surface border-border-subtle hover:bg-bg-surface/80 hover:border-border-strong"
                              }`}
                            >
                              <motion.button
                                type="button"
                                whileHover={checkboxHover}
                                whileTap={controlTap}
                                onClick={() => handleToggle(item.id)}
                                className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
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
                                    if (e.key === "Enter") saveTitle(item.id);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  onBlur={() => saveTitle(item.id)}
                                  className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-text-secondary focus:ring-0"
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
                                      ? "line-through text-text-muted"
                                      : "text-text-secondary"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              )}

                              <motion.button
                                type="button"
                                whileHover={controlHover}
                                whileTap={controlTap}
                                onClick={() =>
                                  setExpandedId((prev) =>
                                    prev === item.id ? null : item.id
                                  )
                                }
                                className="p-2 rounded-lg text-text-muted hover:text-accent-hover hover:bg-bg-surface transition-all duration-200 cursor-pointer"
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
                                <span className="text-xs text-accent-hover font-medium">[{(item.subTasks ?? []).length}]</span>
                              )}
                              {dragHandle}

                              <motion.button
                                type="button"
                                whileHover={controlHover}
                                whileTap={controlTap}
                                onClick={() => handleDelete(item.id)}
                                className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-all duration-200 cursor-pointer"
                                aria-label={t("freetimeModal.deleteAria", "Delete")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </motion.div>

                            {expandedId === item.id && (
                              <div className="pl-11 mt-1">
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
                          </ReorderItem>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </div>
    </ModalContainer>
  );
}

