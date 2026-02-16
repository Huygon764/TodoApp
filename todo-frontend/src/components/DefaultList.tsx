import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { API_PATHS } from "@/constants/api";
import { apiDelete } from "@/lib/api";
import type { DefaultItem } from "@/types";

interface DefaultListProps {
  items: DefaultItem[];
  onAddItem: (title: string) => void;
  onInvalidate: () => void;
}

export function DefaultList({
  items,
  onAddItem,
  onInvalidate,
}: DefaultListProps) {
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6"
    >
      <h2 className="text-lg font-medium text-slate-200 mb-4">
        List mặc định
      </h2>
      <p className="text-slate-500 text-sm mb-4">
        Các item này sẽ được copy sang mỗi ngày mới khi bạn mở lần đầu.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
          placeholder="Thêm vào list mặc định..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={addItem}
          className="px-4 py-2.5 rounded-xl bg-amber-600/80 hover:bg-amber-500/80 text-white font-medium transition"
        >
          Thêm
        </motion.button>
      </div>

      <ul className="space-y-2">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.li
              key={item._id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 group"
            >
              <span className="flex-1 text-slate-200">{item.title}</span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => deleteMutation.mutate(item._id)}
                disabled={deleteMutation.isPending}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-400 transition"
                aria-label="Xóa"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}
