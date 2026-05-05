import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useInlineEdit } from "@/hooks/useInlineEdit";

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
  /** Called when subtask title is edited. If omitted, titles are read-only. */
  onEditTitle?: (subIndex: number, newTitle: string) => void;
  newSubTaskTitle: string;
  onNewSubTaskTitleChange: (value: string) => void;
  onAddSubTask: () => void;
}

export function SubTaskSection({
  subTasks,
  showCheckbox = false,
  onToggle,
  onDelete,
  onEditTitle,
  newSubTaskTitle,
  onNewSubTaskTitleChange,
  onAddSubTask,
}: SubTaskSectionProps) {
  const { t } = useTranslation();
  const {
    editingId: editingIdx,
    editValue,
    setEditValue,
    editInputRef,
    startEdit,
    cancelEdit,
    finishEdit,
  } = useInlineEdit<number>();

  const handleTitleClick = (idx: number, currentTitle: string) => {
    if (!onEditTitle) return;
    startEdit(idx, currentTitle);
  };

  const handleSave = (idx: number, currentTitle: string) => {
    const next = finishEdit();
    if (next == null || next === currentTitle) return;
    onEditTitle?.(idx, next);
  };

  return (
    <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-border-subtle">
      {subTasks.map((st, subIdx) => (
        <div
          key={subIdx}
          className="flex items-center gap-3 py-1.5 pl-3 rounded-lg bg-bg-surface border border-border-subtle"
        >
          {showCheckbox ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onToggle?.(subIdx)}
              className="shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer border-text-muted hover:border-accent-hover hover:bg-accent-primary/10"
            >
              {st.completed && (
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              )}
            </motion.button>
          ) : (
            <span className="text-text-muted shrink-0">-</span>
          )}
          {editingIdx === subIdx && onEditTitle ? (
            <input
              ref={editInputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave(subIdx, st.title);
                if (e.key === "Escape") cancelEdit();
              }}
              onBlur={() => handleSave(subIdx, st.title)}
              className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-text-secondary text-sm focus:ring-0"
            />
          ) : (
            <span
              role={onEditTitle ? "button" : undefined}
              tabIndex={onEditTitle ? 0 : undefined}
              onClick={() => handleTitleClick(subIdx, st.title)}
              onKeyDown={(e) =>
                e.key === "Enter" && handleTitleClick(subIdx, st.title)
              }
              className={`flex-1 text-sm ${onEditTitle ? "cursor-text" : ""} ${
                showCheckbox && st.completed
                  ? "line-through text-text-muted"
                  : "text-text-secondary"
              }`}
            >
              {st.title}
            </span>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onDelete(subIdx)}
            className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger-bg cursor-pointer"
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
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-text-secondary text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary/40"
        />
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onAddSubTask}
          className="px-3 py-2 rounded-lg bg-accent-primary/20 text-accent-hover text-sm font-medium hover:bg-accent-primary/30 cursor-pointer"
        >
          {t("dayTodo.addSubTask", "Add")}
        </motion.button>
      </div>
    </div>
  );
}
