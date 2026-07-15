import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Trash2, ListTodo } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiDelete, apiPatch } from "@/lib/api";
import type { DefaultItem } from "@/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useModalClose } from "@/hooks/useModalClose";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { ItemAddInput } from "@/components/shared/ItemAddInput";
import { ReorderItem } from "@/components/shared/ReorderItem";
import { SubTaskSection } from "@/components/shared/SubTaskSection";
import { SubTaskToggle } from "@/components/shared/SubTaskToggle";
import { TargetBadge } from "@/components/shared/TargetBadge";
import { parseTarget } from "@/lib/parseTarget";

export type DefaultOrderUpdate = { id: string; order: number };

interface DefaultListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DefaultItem[];
  onAddItem: (title: string, target?: number) => void;
  onInvalidate: () => void;
  onReorder?: (updates: DefaultOrderUpdate[]) => void;
}

export function DefaultListModal({
  isOpen,
  onClose,
  items,
  onAddItem,
  onInvalidate,
  onReorder,
}: DefaultListModalProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const controlHover = isMobile ? undefined : { scale: 1.1 };
  const controlTap = isMobile ? { scale: 0.96 } : { scale: 0.9 };
  const [newTitle, setNewTitle] = useState("");
  const [localItems, setLocalItems] = useState<DefaultItem[]>([]);
  const { editingId, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit } = useInlineEdit<string>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<string, string>>({});
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setLocalItems([...items].sort((a, b) => a.order - b.order));
  }, [isOpen, items]);

  useModalClose(isOpen, () => handleCloseRef.current(), contentRef);

  const handleClose = () => {
    if (onReorder && localItems.length > 0) {
      const updates: DefaultOrderUpdate[] = [];
      localItems.forEach((item, idx) => {
        const original = items.find((i) => i._id === item._id);
        if (original != null && original.order !== idx) {
          updates.push({ id: item._id, order: idx });
        }
      });
      if (updates.length > 0) onReorder(updates);
    }
    onClose();
  };

  const handleReorder = (newOrder: DefaultItem[]) => {
    setLocalItems(newOrder.map((it, idx) => ({ ...it, order: idx })));
  };

  const handleCloseRef = useRef<() => void>(() => {});
  handleCloseRef.current = handleClose;

  const addItem = () => {
    const raw = newTitle.trim();
    if (!raw) return;
    const { title, target } = parseTarget(raw);
    onAddItem(title, target);
    setNewTitle("");
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(API_PATHS.DEFAULT_BY_ID(id)),
    onSuccess: () => onInvalidate(),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; title?: string; subTasks?: { title: string }[] }) =>
      apiPatch(API_PATHS.DEFAULT_BY_ID(id), body),
    onSuccess: () => onInvalidate(),
  });

  const handleTitleClick = (id: string) => {
    const item = localItems.find((i) => i._id === id);
    if (item) startEdit(id, item.title);
  };

  const saveDefaultTitle = (id: string) => {
    const value = finishEdit();
    if (!value) return;
    setLocalItems((prev) =>
      prev.map((it) => (it._id === id ? { ...it, title: value } : it))
    );
    patchMutation.mutate({ id, title: value });
  };

  const addSubTask = (itemId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const item = localItems.find((i) => i._id === itemId);
    if (!item) return;
    const parsed = parseTarget(trimmed);
    const newSub = parsed.target
      ? { title: parsed.title, target: parsed.target }
      : { title: parsed.title };
    const subTasks = [...(item.subTasks ?? []), newSub];
    setLocalItems((prev) =>
      prev.map((it) => (it._id === itemId ? { ...it, subTasks } : it))
    );
    patchMutation.mutate({ id: itemId, subTasks });
    setNewSubTaskTitle((prev) => ({ ...prev, [itemId]: "" }));
  };

  const deleteSubTask = (itemId: string, subIndex: number) => {
    const item = localItems.find((i) => i._id === itemId);
    if (!item) return;
    const subTasks = (item.subTasks ?? []).filter((_, i) => i !== subIndex);
    setLocalItems((prev) =>
      prev.map((it) => (it._id === itemId ? { ...it, subTasks: subTasks.length > 0 ? subTasks : undefined } : it))
    );
    patchMutation.mutate({ id: itemId, subTasks });
  };

  const editSubTask = (itemId: string, subIndex: number, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const item = localItems.find((i) => i._id === itemId);
    if (!item) return;
    const subTasks = (item.subTasks ?? []).map((st, i) =>
      i === subIndex ? { ...st, title: trimmed } : st,
    );
    setLocalItems((prev) =>
      prev.map((it) => (it._id === itemId ? { ...it, subTasks } : it)),
    );
    patchMutation.mutate({ id: itemId, subTasks });
  };

  const moveSubTask = (
    itemId: string,
    subIndex: number,
    direction: "up" | "down",
  ) => {
    const item = localItems.find((i) => i._id === itemId);
    if (!item) return;
    const subTasks = [...(item.subTasks ?? [])];
    const target = direction === "up" ? subIndex - 1 : subIndex + 1;
    if (target < 0 || target >= subTasks.length) return;
    [subTasks[subIndex], subTasks[target]] = [
      subTasks[target]!,
      subTasks[subIndex]!,
    ];
    setLocalItems((prev) =>
      prev.map((it) => (it._id === itemId ? { ...it, subTasks } : it)),
    );
    patchMutation.mutate({ id: itemId, subTasks });
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={handleClose} contentRef={contentRef} zBackdrop="z-40" zContent="z-50">
                <ModalHeader
                  icon={<ListTodo className="w-5 h-5 text-accent-hover" />}
                  title={t("defaultModal.title")}
                  subtitle={t("defaultModal.subtitle")}
                  onClose={handleClose}
                />

                <ItemAddInput
                  value={newTitle}
                  onChange={setNewTitle}
                  onAdd={addItem}
                  placeholder={t("defaultModal.addPlaceholder")}
                  addLabel={t("defaultModal.add")}
                />

                {/* List */}
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {localItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                      <ListTodo className="w-10 h-10 mb-2 opacity-30" />
                      <p>{t("defaultModal.empty")}</p>
                    </div>
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={localItems}
                      onReorder={handleReorder}
                      className="space-y-2"
                    >
                      <AnimatePresence mode="popLayout">
                        {localItems.map((item) => (
                          <ReorderItem key={item._id} item={item} isMobile={isMobile}>
                            {(dragHandle) => (
                              <>
                            <div className="rounded-xl bg-bg-surface border border-border-subtle hover:bg-bg-surface/80 group transition-all duration-200">
                              <div className="flex items-center gap-3 p-3">
                                {editingId === item._id ? (
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") saveDefaultTitle(item._id);
                                      if (e.key === "Escape") cancelEdit();
                                    }}
                                    onBlur={() => saveDefaultTitle(item._id)}
                                    className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-text-secondary focus:ring-0"
                                  />
                                ) : (
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleTitleClick(item._id)}
                                    onKeyDown={(e) =>
                                      e.key === "Enter" && handleTitleClick(item._id)
                                    }
                                    className="flex-1 text-text-secondary cursor-text"
                                  >
                                    {item.title}
                                  </span>
                                )}
                                {item.target != null ? (
                                  <TargetBadge target={item.target} />
                                ) : (
                                  <SubTaskToggle
                                    count={(item.subTasks ?? []).length}
                                    expanded={expandedId === item._id}
                                    isMobile={isMobile}
                                    onClick={() =>
                                      setExpandedId((prev) => (prev === item._id ? null : item._id))
                                    }
                                  />
                                )}
                                {dragHandle}
                                <motion.button
                                  type="button"
                                  whileHover={controlHover}
                                  whileTap={controlTap}
                                  onClick={() => deleteMutation.mutate(item._id)}
                                  disabled={deleteMutation.isPending}
                                  className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-all duration-200 disabled:opacity-50 cursor-pointer"
                                  aria-label={t("defaultModal.deleteAria")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </motion.button>
                              </div>
                              {expandedId === item._id && (
                                <SubTaskSection
                                  subTasks={item.subTasks ?? []}
                                  onDelete={(subIdx) => deleteSubTask(item._id, subIdx)}
                                  onEditTitle={(subIdx, val) =>
                                    editSubTask(item._id, subIdx, val)
                                  }
                                  onMove={(subIdx, dir) =>
                                    moveSubTask(item._id, subIdx, dir)
                                  }
                                  newSubTaskTitle={newSubTaskTitle[item._id] ?? ""}
                                  onNewSubTaskTitleChange={(val) =>
                                    setNewSubTaskTitle((prev) => ({ ...prev, [item._id]: val }))
                                  }
                                  onAddSubTask={() => addSubTask(item._id, newSubTaskTitle[item._id] ?? "")}
                                />
                              )}
                            </div>
                              </>
                            )}
                          </ReorderItem>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border-default bg-bg-page/30">
                  <p className="text-xs text-text-muted text-center">
                    💡 {t("defaultModal.footerTip")}
                  </p>
                </div>
    </ModalContainer>
  );
}
