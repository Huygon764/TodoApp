import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { X, Plus, Trash2, ListTodo } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiDelete } from "@/lib/api";
import type { DefaultItem } from "@/types";

export type DefaultOrderUpdate = { id: string; order: number };

interface DefaultListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DefaultItem[];
  onAddItem: (title: string) => void;
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
  const [newTitle, setNewTitle] = useState("");
  const [localItems, setLocalItems] = useState<DefaultItem[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setLocalItems([...items].sort((a, b) => a.order - b.order));
  }, [isOpen, items]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      handleCloseRef.current();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

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
    const t = newTitle.trim();
    if (!t) return;
    onAddItem(t);
    setNewTitle("");
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(API_PATHS.DEFAULT_BY_ID(id)),
    onSuccess: () => onInvalidate(),
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg" ref={contentRef}>
              {/* Modal glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-50" />
              
              <div className="relative bg-[#1a1f2e]/95 backdrop-blur-xl rounded-3xl border border-white/[0.08] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10">
                      <ListTodo className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">{t("defaultModal.title")}</h2>
                      <p className="text-sm text-slate-500">{t("defaultModal.subtitle")}</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Add Input */}
                <div className="p-4 border-b border-white/[0.04]">
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Plus className="w-5 h-5 text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addItem()}
                        placeholder={t("defaultModal.addPlaceholder")}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-700/50 border border-white/[0.04] text-slate-100 placeholder-slate-500 
                          focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 
                          hover:border-slate-600 transition-all duration-200"
                      />
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addItem}
                      disabled={!newTitle.trim()}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 
                        text-white font-semibold transition-all duration-200 shadow-lg shadow-amber-500/20
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("defaultModal.add")}
                    </motion.button>
                  </div>
                </div>

                {/* List */}
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {localItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
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
                          <Reorder.Item
                            key={item._id}
                            value={item}
                            drag
                            className="cursor-grab active:cursor-grabbing"
                          >
                            <motion.li
                              layout
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 border border-white/[0.04] hover:bg-slate-700/50 group transition-all duration-200 list-none"
                            >
                              <span className="flex-1 text-slate-200">{item.title}</span>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => deleteMutation.mutate(item._id)}
                                disabled={deleteMutation.isPending}
                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                                aria-label={t("defaultModal.deleteAria")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </motion.li>
                          </Reorder.Item>
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/[0.06] bg-slate-900/30">
                  <p className="text-xs text-slate-500 text-center">
                    💡 {t("defaultModal.footerTip")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
