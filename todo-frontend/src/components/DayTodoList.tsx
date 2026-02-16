import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DayTodo, DayTodoItem } from "@/types";

interface DayTodoListProps {
  dayTodo: DayTodo | null;
  isLoading: boolean;
  selectedDate?: string;
  onUpdateItems: (items: DayTodoItem[]) => void;
}

export function DayTodoList({
  dayTodo,
  isLoading,
  onUpdateItems,
}: DayTodoListProps) {
  const [newTitle, setNewTitle] = useState("");
  const items = dayTodo?.items ?? [];

  const handleAdd = () => {
    const t = newTitle.trim();
    if (!t) return;
    const nextOrder = items.length;
    onUpdateItems([
      ...items,
      { title: t, completed: false, order: nextOrder },
    ]);
    setNewTitle("");
  };

  const handleToggle = (index: number) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, completed: !item.completed } : item
    );
    onUpdateItems(next);
  };

  const handleDelete = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onUpdateItems(next);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6">
        <h2 className="text-lg font-medium text-slate-200 mb-4">
          Todo ngày này
        </h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-xl bg-slate-700/30 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6"
    >
      <h2 className="text-lg font-medium text-slate-200 mb-4">
        Todo ngày này
      </h2>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Thêm vào ngày này..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
        >
          Thêm
        </motion.button>
      </div>

      <ul className="space-y-2">
        <AnimatePresence mode="popLayout">
          {items.map((item, index) => (
            <motion.li
              key={`${index}-${item.title}`}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 py-2 px-3 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 group"
            >
              <button
                type="button"
                onClick={() => handleToggle(index)}
                className="flex-shrink-0 w-6 h-6 rounded-md border-2 border-slate-500 flex items-center justify-center transition hover:border-indigo-400"
              >
                {item.completed && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-indigo-400"
                  >
                    ✓
                  </motion.span>
                )}
              </button>
              <span
                className={`flex-1 text-slate-200 ${
                  item.completed ? "line-through text-slate-500" : ""
                }`}
              >
                {item.title}
              </span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDelete(index)}
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
