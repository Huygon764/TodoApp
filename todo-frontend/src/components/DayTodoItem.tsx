import type { ReactNode, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Check } from "lucide-react";
import type { DayTodoSubTask, DayTodoItem as DayTodoItemType } from "@/types";
import { SubTaskSection } from "@/components/shared/SubTaskSection";
import { SubTaskToggle } from "@/components/shared/SubTaskToggle";

export interface DayTodoItemView extends DayTodoItemType {
  id: string;
  subTasks: DayTodoSubTask[];
}

/** Format a "YYYY-MM-DD" carry-over origin date as "DD/MM" */
function formatCarriedFrom(date?: string): string {
  if (!date) return "";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}`;
}

interface DayTodoItemProps {
  item: DayTodoItemView;
  isMobile: boolean;
  pendingToggle: string | null;
  expanded: boolean;
  editing: boolean;
  editValue: string;
  editInputRef: RefObject<HTMLInputElement>;
  newSubTaskTitle: string;
  dragHandle: ReactNode;
  onToggle: (id: string) => void;
  onTitleClick: (id: string) => void;
  onTitleChange: (value: string) => void;
  onTitleSave: (id: string) => void;
  onTitleCancel: () => void;
  onToggleExpand: (id: string) => void;
  onDelete: (id: string) => void;
  onSubTaskAdd: (id: string) => void;
  onSubTaskToggle: (id: string, subIndex: number) => void;
  onSubTaskDelete: (id: string, subIndex: number) => void;
  onSubTaskEdit: (id: string, subIndex: number, newTitle: string) => void;
  onSubTaskMove: (id: string, subIndex: number, direction: "up" | "down") => void;
  onNewSubTaskTitleChange: (id: string, value: string) => void;
}

export function DayTodoItem({
  item,
  isMobile,
  pendingToggle,
  expanded,
  editing,
  editValue,
  editInputRef,
  newSubTaskTitle,
  dragHandle,
  onToggle,
  onTitleClick,
  onTitleChange,
  onTitleSave,
  onTitleCancel,
  onToggleExpand,
  onDelete,
  onSubTaskAdd,
  onSubTaskToggle,
  onSubTaskDelete,
  onSubTaskEdit,
  onSubTaskMove,
  onNewSubTaskTitleChange,
}: DayTodoItemProps) {
  const { t } = useTranslation();
  const controlHover = isMobile ? undefined : { scale: 1.1 };
  const controlTap = isMobile ? { scale: 0.96 } : { scale: 0.9 };
  const checkboxHover = isMobile ? undefined : { scale: 1.15 };
  const subTaskCount = item.subTasks.length;

  return (
    <>
      <motion.div
        className={`flex items-center rounded-xl border transition-colors duration-200 ${
          isMobile ? "gap-2 p-3" : "gap-4 p-4"
        } ${
          item.completed
            ? "bg-accent-primary/5 border-accent-primary/20"
            : "bg-bg-surface border-border-subtle hover:bg-bg-surface/80 hover:border-border-strong"
        }`}
        animate={{
          scale: pendingToggle === item.id ? 0.98 : 1,
        }}
        transition={{
          duration: isMobile ? 0.1 : 0.15,
          ease: "easeOut",
        }}
      >
        <motion.button
          type="button"
          whileHover={checkboxHover}
          whileTap={controlTap}
          onClick={() => onToggle(item.id)}
          disabled={pendingToggle !== null}
          className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
            item.completed
              ? "bg-accent-primary border-accent-primary"
              : "border-text-muted hover:border-accent-hover hover:bg-accent-primary/10"
          } disabled:cursor-not-allowed`}
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

        {editing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editValue}
            onChange={(e) => onTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onTitleSave(item.id);
              if (e.key === "Escape") onTitleCancel();
            }}
            onBlur={() => onTitleSave(item.id)}
            className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-text-secondary focus:ring-0"
          />
        ) : (
          <motion.span
            role="button"
            tabIndex={0}
            onClick={() => onTitleClick(item.id)}
            onKeyDown={(e) => e.key === "Enter" && onTitleClick(item.id)}
            className={`flex-1 min-w-0 break-words [overflow-wrap:anywhere] transition-all duration-300 cursor-text ${
              item.completed
                ? "line-through text-text-muted"
                : "text-text-secondary"
            }`}
            animate={isMobile ? undefined : { x: item.completed ? 4 : 0 }}
          >
            {item.title}
          </motion.span>
        )}

        <SubTaskToggle
          count={subTaskCount}
          expanded={expanded}
          isMobile={isMobile}
          onClick={() => onToggleExpand(item.id)}
        />
        {dragHandle}
        <motion.button
          type="button"
          whileHover={controlHover}
          whileTap={controlTap}
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-all duration-200 cursor-pointer"
          aria-label={t("dayTodo.deleteAria")}
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </motion.div>
      {!editing && !!item.postponeCount && (
        <div className="pl-12 mt-1">
          <span
            className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
            title={t("dayTodo.carriedTooltip")}
          >
            {t("dayTodo.carriedBadge", {
              count: item.postponeCount,
              date: formatCarriedFrom(item.carriedFrom),
            })}
          </span>
        </div>
      )}
      {expanded && (
        <div className="pl-12 mt-1">
          <SubTaskSection
            subTasks={item.subTasks}
            showCheckbox={true}
            onToggle={(subIdx) => onSubTaskToggle(item.id, subIdx)}
            onDelete={(subIdx) => onSubTaskDelete(item.id, subIdx)}
            onEditTitle={(subIdx, val) => onSubTaskEdit(item.id, subIdx, val)}
            onMove={(subIdx, dir) => onSubTaskMove(item.id, subIdx, dir)}
            newSubTaskTitle={newSubTaskTitle}
            onNewSubTaskTitleChange={(val) =>
              onNewSubTaskTitleChange(item.id, val)
            }
            onAddSubTask={() => onSubTaskAdd(item.id)}
          />
        </div>
      )}
    </>
  );
}
