import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, ListTodo } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiDelete } from "@/lib/api";
import type { DefaultItem } from "@/types";

interface DefaultListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: DefaultItem[];
  onAddItem: (title: string) => void;
  onInvalidate: () => void;
}

export function DefaultListModal({
  isOpen,
  onClose,
  items,
  onAddItem,
  onInvalidate,
}: DefaultListModalProps) {
  const [newTitle, setNewTitle] = useState("");

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
            onClick={onClose}
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
            <div className="relative w-full max-w-lg">
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
                      <h2 className="text-xl font-semibold text-white">Template mặc định</h2>
                      <p className="text-sm text-slate-500">Tự động copy sang mỗi ngày mới</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
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
                        placeholder="Thêm template mới..."
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
                      Thêm
                    </motion.button>
                  </div>
                </div>

                {/* List */}
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <ListTodo className="w-10 h-10 mb-2 opacity-30" />
                      <p>Chưa có template nào</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {items.map((item) => (
                          <motion.li
                            key={item._id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-700/30 border border-white/[0.04] hover:bg-slate-700/50 group transition-all duration-200"
                          >
                            <span className="flex-1 text-slate-200">{item.title}</span>
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => deleteMutation.mutate(item._id)}
                              disabled={deleteMutation.isPending}
                              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
                              aria-label="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/[0.06] bg-slate-900/30">
                  <p className="text-xs text-slate-500 text-center">
                    💡 Các template sẽ được tự động thêm vào danh sách công việc mỗi ngày mới
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
