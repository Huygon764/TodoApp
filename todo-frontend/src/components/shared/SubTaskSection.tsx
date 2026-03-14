import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SubTask {
  title: string;
  completed?: boolean;
}

interface SubTaskSectionProps {
  subTasks: SubTask[];
  /** Whether sub-tasks have completion toggle (DayTodo/Freetime have it, templates don't) */
  showCheckbox?: boolean;
  onToggle?: (subIndex: number) => void;
  onDelete: (subIndex: number) => void;
  newSubTaskTitle: string;
  onNewSubTaskTitleChange: (value: string) => void;
  onAddSubTask: () => void;
}

export function SubTaskSection({
  subTasks,
  showCheckbox = false,
  onToggle,
  onDelete,
  newSubTaskTitle,
  onNewSubTaskTitleChange,
  onAddSubTask,
}: SubTaskSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-white/[0.04]">
      {subTasks.map((st, subIdx) => (
        <div
          key={subIdx}
          className="flex items-center gap-3 py-1.5 pl-3 rounded-lg bg-linear-surface border border-white/[0.04]"
        >
          {showCheckbox ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onToggle?.(subIdx)}
              className="shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer border-slate-500 hover:border-linear-accent-hover hover:bg-[#5E6AD2]/10"
            >
              {st.completed && (
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              )}
            </motion.button>
          ) : (
            <span className="text-slate-500 shrink-0">-</span>
          )}
          <span
            className={`flex-1 text-sm ${
              showCheckbox && st.completed
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
            onClick={() => onDelete(subIdx)}
            className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
            aria-label={t("common.deleteSubTaskAria", "Delete sub-task")}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={newSubTaskTitle}
          onChange={(e) => onNewSubTaskTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAddSubTask();
          }}
          placeholder={t("dayTodo.addSubTaskPlaceholder", "Add sub-task")}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-linear-surface border border-white/[0.04] text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/40"
        />
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddSubTask}
          className="px-3 py-2 rounded-lg bg-[#5E6AD2]/20 text-[#7C85E0] text-sm font-medium hover:bg-[#5E6AD2]/30 cursor-pointer"
        >
          {t("dayTodo.addSubTask", "Add")}
        </motion.button>
      </div>
    </div>
  );
}
