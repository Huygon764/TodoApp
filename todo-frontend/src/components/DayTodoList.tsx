import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Check, Circle, TrendingUp } from "lucide-react";
import type { DayTodo, DayTodoItem } from "@/types";

interface DayTodoListProps {
  dayTodo: DayTodo | null;
  isLoading: boolean;
  onUpdateItems: (items: DayTodoItem[]) => void;
}

export function DayTodoList({
  dayTodo,
  isLoading,
  onUpdateItems,
}: DayTodoListProps) {
  const [newTitle, setNewTitle] = useState("");
  const items = dayTodo?.items ?? [];
  
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-3xl blur-xl opacity-50" />
        <div className="relative rounded-3xl bg-slate-800/50 border border-white/[0.06] backdrop-blur-sm p-6">
          <div className="h-8 w-48 bg-slate-700/50 rounded-lg animate-pulse mb-6" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-700/30 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Card glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-3xl blur-xl opacity-50" />
      
      <motion.div
        layout
        className="relative rounded-3xl bg-slate-800/50 border border-white/[0.06] backdrop-blur-sm overflow-hidden"
      >
        {/* Header with Stats */}
        <div className="p-6 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Công việc hôm nay
                </h2>
                <p className="text-sm text-slate-500">
                  {completedCount}/{totalCount} hoàn thành
                </p>
              </div>
            </div>
            {totalCount > 0 && (
              <div className="text-right">
                <span className="text-2xl font-bold text-emerald-400">{progressPercent}%</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
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
                <Plus className="w-5 h-5 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              </div>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Thêm công việc mới..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-700/50 border border-white/[0.04] text-slate-100 placeholder-slate-500 
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 
                  hover:border-slate-600 transition-all duration-200"
              />
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="px-5 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 
                text-white font-semibold transition-all duration-200 shadow-lg shadow-emerald-500/20
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-teal-500"
            >
              Thêm
            </motion.button>
          </div>
        </div>

        {/* Todo List */}
        <div className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Circle className="w-12 h-12 mb-3 opacity-30" />
              <p>Chưa có công việc nào</p>
              <p className="text-sm">Thêm công việc mới để bắt đầu</p>
            </div>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <motion.li
                    key={`${index}-${item.title}`}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="group"
                  >
                    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                      item.completed 
                        ? 'bg-emerald-500/5 border-emerald-500/20' 
                        : 'bg-slate-700/30 border-white/[0.04] hover:bg-slate-700/50 hover:border-white/[0.08]'
                    }`}>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleToggle(index)}
                        className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                          item.completed
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-500 hover:border-emerald-400'
                        }`}
                      >
                        {item.completed && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            <Check className="w-4 h-4 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                      
                      <span className={`flex-1 transition-all duration-200 ${
                        item.completed 
                          ? 'line-through text-slate-500' 
                          : 'text-slate-200'
                      }`}>
                        {item.title}
                      </span>
                      
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(index)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                        aria-label="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  );
}
