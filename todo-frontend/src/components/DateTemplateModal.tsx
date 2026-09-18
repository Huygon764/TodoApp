import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { DayPicker } from "react-day-picker";
import { Trash2, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DateTemplateIcon } from "@/components/icons/DateTemplateIcon";
import { enUS, vi } from "react-day-picker/locale";
import { API_PATHS } from "@/constants/api";
import { DAY_PICKER_CLASS_NAMES } from "@/constants/dayPickerStyles";
import { apiGet, apiPatch } from "@/lib/api";
import type { DateTemplate, DateTemplateItem } from "@/types";
import { getTodayInTimezone } from "@/lib/datePeriod";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useModalClose } from "@/hooks/useModalClose";
import { ModalFrame } from "@/components/shared/ModalFrame";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { ItemAddInput } from "@/components/shared/ItemAddInput";
import { SubTaskSection } from "@/components/shared/SubTaskSection";
import { SubTaskToggle } from "@/components/shared/SubTaskToggle";
import { TargetBadge } from "@/components/shared/TargetBadge";
import { LinkifiedText } from "@/components/shared/LinkifiedText";
import { parseTarget } from "@/lib/parseTarget";

const DATE_PICKER_YEAR = new Date().getFullYear();
const DATE_PICKER_START_MONTH = new Date(DATE_PICKER_YEAR - 10, 0);
const DATE_PICKER_END_MONTH = new Date(DATE_PICKER_YEAR + 10, 11);

interface DateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: e.g. invalidate day query when saved for the selected date */
  onSaved?: (date: string) => void;
  embedded?: boolean;
}

export function DateTemplateModal({
  isOpen,
  onClose,
  onSaved,
  embedded = false,
}: DateTemplateModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(() => getTodayInTimezone());
  const [items, setItems] = useState<DateTemplateItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const { editingId: editingIndex, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit } = useInlineEdit<number>();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState<Record<number, string>>({});

  useEffect(() => {
    if (isOpen) setSelectedDate(getTodayInTimezone());
  }, [isOpen]);

  const queryKey = ["dateTemplate", selectedDate];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ dateTemplate: DateTemplate }>(
        API_PATHS.DATE_TEMPLATE(selectedDate)
      );
      return res.data?.dateTemplate ?? null;
    },
    enabled: isOpen && !!selectedDate,
  });

  useEffect(() => {
    if (data?.items) {
      const sorted = [...data.items].sort((a, b) => a.order - b.order);
      setItems(sorted);
    } else if (data && data.items.length === 0) {
      setItems([]);
    }
  }, [data, selectedDate]);

  const patchMutation = useMutation({
    mutationFn: ({
      date,
      items: nextItems,
    }: {
      date: string;
      items: DateTemplateItem[];
    }) =>
      apiPatch<{ dateTemplate: DateTemplate }>(API_PATHS.DATE_TEMPLATE(date), {
        items: nextItems,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["dateTemplate", variables.date] });
      queryClient.invalidateQueries({ queryKey: ["day", variables.date] });
      onSaved?.(variables.date);
    },
  });

  const persist = (next: DateTemplateItem[]) => {
    const normalized = next
      .map((it, i) => ({
        title: it.title.trim(),
        order: i,
        ...(it.target ? { target: it.target } : {}),
        ...(it.subTasks && it.subTasks.length > 0 ? { subTasks: it.subTasks } : {}),
      }))
      .filter((it) => it.title.length > 0);
    setItems(normalized);
    patchMutation.mutate({ date: selectedDate, items: normalized });
  };

  const handleSelectDay = (date: Date | undefined) => {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const addItem = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const { title, target } = parseTarget(trimmed);
    persist([
      ...items,
      { title, order: items.length, ...(target ? { target } : {}) },
    ]);
    setNewTitle("");
  };

  const removeItem = (index: number) => {
    persist(
      items
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, order: i })),
    );
  };

  const handleTitleClick = (index: number) => {
    const item = items[index];
    if (item) startEdit(index, item.title);
  };

  const saveTitleEdit = (index: number) => {
    const value = finishEdit();
    if (!value || value === items[index]?.title) return;
    persist(
      items.map((it, i) => (i === index ? { ...it, title: value } : it)),
    );
  };

  const addSubTask = (index: number, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const parsed = parseTarget(trimmed);
    const newSub = parsed.target
      ? { title: parsed.title, target: parsed.target }
      : { title: parsed.title };
    persist(
      items.map((it, i) =>
        i === index
          ? { ...it, subTasks: [...(it.subTasks ?? []), newSub] }
          : it,
      ),
    );
    setNewSubTaskTitle((prev) => ({ ...prev, [index]: "" }));
  };

  const deleteSubTask = (index: number, subIndex: number) => {
    persist(
      items.map((it, i) => {
        if (i !== index) return it;
        const subTasks = (it.subTasks ?? []).filter((_, si) => si !== subIndex);
        return { ...it, subTasks: subTasks.length > 0 ? subTasks : undefined };
      }),
    );
  };

  const editSubTask = (index: number, subIndex: number, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    persist(
      items.map((it, i) => {
        if (i !== index) return it;
        const subTasks = (it.subTasks ?? []).map((st, si) =>
          si === subIndex ? { ...st, title: trimmed } : st,
        );
        return { ...it, subTasks };
      }),
    );
  };

  const moveSubTask = (
    index: number,
    subIndex: number,
    direction: "up" | "down",
  ) => {
    persist(
      items.map((it, i) => {
        if (i !== index) return it;
        const subTasks = [...(it.subTasks ?? [])];
        const target = direction === "up" ? subIndex - 1 : subIndex + 1;
        if (target < 0 || target >= subTasks.length) return it;
        [subTasks[subIndex], subTasks[target]] = [
          subTasks[target]!,
          subTasks[subIndex]!,
        ];
        return { ...it, subTasks };
      }),
    );
  };

  useModalClose(!embedded && isOpen, onClose, contentRef);

  const locale = i18n.language === "vi" ? vi : enUS;
  const selectedDateObj = selectedDate
    ? new Date(selectedDate + "T12:00:00")
    : undefined;

  return (
    <ModalFrame embedded={embedded} isOpen={isOpen} onClose={onClose} contentRef={contentRef}>
                {!embedded && (
                <ModalHeader
                  icon={<DateTemplateIcon className="w-5 h-5 text-accent-hover" />}
                  title={t("dateTemplateModal.title")}
                  subtitle={t("dateTemplateModal.subtitle")}
                  onClose={onClose}
                />
                )}

                <div className="p-4 border-b border-border-subtle">
                  <p className="text-sm text-text-tertiary mb-3">
                    {selectedDate}
                  </p>
                  <div className="rounded-xl border border-border-default bg-bg-surface p-2">
                    <DayPicker
                      mode="single"
                      locale={locale}
                      selected={selectedDateObj}
                      onSelect={handleSelectDay}
                      captionLayout="dropdown"
                      navLayout="around"
                      startMonth={DATE_PICKER_START_MONTH}
                      endMonth={DATE_PICKER_END_MONTH}
                      classNames={{
                        ...DAY_PICKER_CLASS_NAMES,
                        month: "relative",
                        month_caption:
                          "flex items-center justify-center mb-3 mx-10",
                        button_previous: `${DAY_PICKER_CLASS_NAMES.button_previous} absolute left-0 top-0`,
                        button_next: `${DAY_PICKER_CLASS_NAMES.button_next} absolute right-0 top-0`,
                      }}
                      weekStartsOn={i18n.language === "vi" ? 1 : 0}
                      components={{
                        Chevron: ({ orientation, className }) =>
                          orientation === "down" ? (
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-text-muted ${className ?? ""}`}
                            />
                          ) : (
                            <span className="sr-only" />
                          ),
                        PreviousMonthButton: (props) => (
                          <button
                            {...props}
                            className={`${DAY_PICKER_CLASS_NAMES.button_previous} ${props.className ?? ""}`}
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        ),
                        NextMonthButton: (props) => (
                          <button
                            {...props}
                            className={`${DAY_PICKER_CLASS_NAMES.button_next} ${props.className ?? ""}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ),
                      }}
                    />
                  </div>
                </div>

                <ItemAddInput
                  value={newTitle}
                  onChange={setNewTitle}
                  onAdd={addItem}
                  placeholder={t("dateTemplateModal.addPlaceholder")}
                  addLabel={t("dateTemplateModal.add")}
                  disabled={patchMutation.isPending}
                />

                <div className="p-4 max-h-[240px] overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-text-muted">
                      <span className="text-sm">Loading...</span>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                      <DateTemplateIcon className="w-10 h-10 mb-2 opacity-30" />
                      <p>{t("dateTemplateModal.empty")}</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {items.map((item, index) => (
                          <motion.li
                            key={`${item.title}-${index}`}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="rounded-xl bg-bg-surface border border-border-subtle hover:bg-bg-surface/80 group transition-all duration-200"
                          >
                            <div className="flex items-center gap-3 p-3">
                              {editingIndex === index ? (
                                <input
                                  ref={editInputRef}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTitleEdit(index);
                                    if (e.key === "Escape") cancelEdit();
                                  }}
                                  onBlur={() => saveTitleEdit(index)}
                                  className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-text-secondary focus:ring-0"
                                />
                              ) : (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleTitleClick(index)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && handleTitleClick(index)
                                  }
                                  className="flex-1 min-w-0 break-words [overflow-wrap:anywhere] text-text-secondary cursor-text"
                                >
                                  <LinkifiedText text={item.title} />
                                </span>
                              )}
                              {item.target != null ? (
                                <TargetBadge target={item.target} />
                              ) : (
                                <SubTaskToggle
                                  count={(item.subTasks ?? []).length}
                                  expanded={expandedIdx === index}
                                  onClick={() =>
                                    setExpandedIdx((prev) => (prev === index ? null : index))
                                  }
                                />
                              )}
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeItem(index)}
                                className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-bg transition-all duration-200"
                                aria-label={t("dateTemplateModal.deleteAria")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                            {expandedIdx === index && (
                              <SubTaskSection
                                subTasks={item.subTasks ?? []}
                                onDelete={(subIdx) => deleteSubTask(index, subIdx)}
                                onEditTitle={(subIdx, val) =>
                                  editSubTask(index, subIdx, val)
                                }
                                onMove={(subIdx, dir) =>
                                  moveSubTask(index, subIdx, dir)
                                }
                                newSubTaskTitle={newSubTaskTitle[index] ?? ""}
                                onNewSubTaskTitleChange={(val) =>
                                  setNewSubTaskTitle((prev) => ({ ...prev, [index]: val }))
                                }
                                onAddSubTask={() => addSubTask(index, newSubTaskTitle[index] ?? "")}
                              />
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>

                <div className="p-4 border-t border-border-default bg-bg-page/30">
                  <p className="text-xs text-text-muted text-center">
                    {t("dateTemplateModal.footerTip")}
                  </p>
                </div>
    </ModalFrame>
  );
}
