import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Plus, Trash2, Check, Circle, TrendingUp, FileText } from "lucide-react";
import type { DayTodo, DayTodoItem } from "@/types";

// Extend DayTodoItem với unique ID
interface DayTodoItemWithId extends DayTodoItem {
  id: string;
}

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Add ID to items if not exists
const addIdsToItems = (items: DayTodoItem[]): DayTodoItemWithId[] => {
  return items.map((item, index) => ({
    ...item,
    id: `item-${index}-${item.title.slice(0, 10)}`,
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
  onOpenReview?: () => void;
}

export function DayTodoList({
  dayTodo,
  isLoading,
  onUpdateItems,
  onOpenReview,
}: DayTodoListProps) {
  const { t } = useTranslation();
  const [newTitle, setNewTitle] = useState("");
  const [items, setItems] = useState<DayTodoItemWithId[]>([]);
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);

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

  const handleAdd = () => {
    const t = newTitle.trim();
    if (!t) return;
    
    const newItem: DayTodoItemWithId = {
      id: generateId(),
      title: t,
      completed: false,
      order: items.length,
    };
    
    const newItems = [...items, newItem];
    setItems(newItems);
    onUpdateItems(removeIdsFromItems(newItems));
    setNewTitle("");
  };

  const handleToggle = (id: string) => {
    // Prevent double click during animation
    if (pendingToggle) return;
    
    setPendingToggle(id);
    
    // Step 1: Toggle completed status (checkbox animation)
    const toggled = items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    setItems(toggled);
    
    // Step 2: Delay reorder for smooth animation
    setTimeout(() => {
      const incomplete = toggled.filter(it => !it.completed);
      const completed = toggled.filter(it => it.completed);
      
      const reordered = [
        ...incomplete.map((it, idx) => ({ ...it, order: idx })),
        ...completed.map((it, idx) => ({ ...it, order: incomplete.length + idx })),
      ];
      
      setItems(reordered);
      onUpdateItems(removeIdsFromItems(reordered));
      setPendingToggle(null);
    }, 400); // Delay để animation checkbox hoàn thành trước
  };

  const handleDelete = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    const reordered = filtered.map((it, idx) => ({ ...it, order: idx }));
    
    setItems(reordered);
    onUpdateItems(removeIdsFromItems(reordered));
  };

  const handleReorder = (newOrder: DayTodoItemWithId[]) => {
    const reordered = newOrder.map((it, idx) => ({ ...it, order: idx }));
    setItems(reordered);
    onUpdateItems(removeIdsFromItems(reordered));
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
      
      <div className="relative rounded-3xl bg-slate-800/50 border border-white/[0.06] backdrop-blur-sm overflow-hidden">
        {/* Header with Stats */}
        <div className="p-6 pb-4 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
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
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl font-bold text-emerald-400"
                >
                  {progressPercent}%
                </motion.span>
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
                placeholder={t("dayTodo.addPlaceholder")}
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
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-teal-500 cursor-pointer"
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
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      transition: {
                        type: "spring",
                        stiffness: 100,
                        damping: 25,
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: -100,
                      transition: { duration: 0.2 }
                    }}
                    layout
                    layoutId={item.id}
                    drag={false}
                    className="group"
                  >
                    <motion.div 
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors duration-200 ${
                        item.completed 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : 'bg-slate-700/30 border-white/[0.04] hover:bg-slate-700/50 hover:border-white/[0.08]'
                      }`}
                      animate={{
                        scale: pendingToggle === item.id ? 0.98 : 1,
                      }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Checkbox */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleToggle(item.id)}
                        disabled={pendingToggle !== null}
                        className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          item.completed
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-500 hover:border-emerald-400 hover:bg-emerald-500/10'
                        } disabled:cursor-not-allowed`}
                      >
                        <AnimatePresence mode="wait">
                          {item.completed && (
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, rotate: 45 }}
                              transition={{ 
                                type: "spring",
                                stiffness: 500,
                                damping: 15,
                              }}
                            >
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                      
                      {/* Title */}
                      <motion.span 
                        className={`flex-1 transition-all duration-300 ${
                          item.completed 
                            ? 'line-through text-slate-500' 
                            : 'text-slate-200'
                        }`}
                        animate={{
                          x: item.completed ? 4 : 0,
                        }}
                      >
                        {item.title}
                      </motion.span>
                      
                      {/* Delete Button - always visible */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
                        aria-label={t("dayTodo.deleteAria")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
            </Reorder.Group>
          )}

          {/* Review myself - fixed row */}
          {onOpenReview && (
            <motion.button
              type="button"
              onClick={onOpenReview}
              className="mt-3 w-full flex items-center gap-4 p-4 rounded-xl border border-white/[0.04] bg-slate-700/20 hover:bg-slate-700/40 hover:border-emerald-500/30 transition-all duration-200 text-left group"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-lg border-2 border-slate-500 flex items-center justify-center group-hover:border-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
              </div>
              <span className="flex-1 text-slate-200 font-medium">
                {t("dayTodo.reviewMyself")}
              </span>
              <span className="text-slate-500 text-sm group-hover:text-emerald-400 transition-colors">
                {t("dayTodo.view")}
              </span>
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
