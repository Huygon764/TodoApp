import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Users, ChevronDown, ChevronRight } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { PersonNote } from "@/types";
import { useModalClose } from "@/hooks/useModalClose";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { ItemAddInput } from "@/components/shared/ItemAddInput";

interface PeopleNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PeopleNotesModal({ isOpen, onClose }: PeopleNotesModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);

  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState<Record<string, string>>({});
  const {
    editingId: editingNameId,
    editValue: editNameValue,
    setEditValue: setEditNameValue,
    editInputRef: editNameRef,
    startEdit: startEditName,
    cancelEdit: cancelEditName,
    finishEdit: finishEditName,
  } = useInlineEdit<string>();

  const queryKey = ["peopleNotes"];

  const { data } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiGet<{ items: PersonNote[] }>(API_PATHS.PEOPLE_NOTES);
      return res.data?.items ?? [];
    },
    enabled: isOpen,
  });

  const people = data ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiPost<{ item: PersonNote }>(API_PATHS.PEOPLE_NOTES, {
        name,
        order: people.length,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; notes?: string[] }) =>
      apiPatch<{ item: PersonNote }>(API_PATHS.PEOPLE_NOTE_BY_ID(id), body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(API_PATHS.PEOPLE_NOTE_BY_ID(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  useModalClose(isOpen, onClose, contentRef);

  const addPerson = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
    setNewName("");
  };

  const handleStartEditName = (person: PersonNote) => {
    startEditName(person._id, person.name);
  };

  const saveEditName = (id: string) => {
    const value = finishEditName();
    if (!value) return;
    patchMutation.mutate({ id, name: value });
  };

  const addNote = (person: PersonNote) => {
    const text = (newNoteText[person._id] ?? "").trim();
    if (!text) return;
    const notes = [...person.notes, text];
    patchMutation.mutate({ id: person._id, notes });
    setNewNoteText((prev) => ({ ...prev, [person._id]: "" }));
  };

  const deleteNote = (person: PersonNote, noteIndex: number) => {
    const notes = person.notes.filter((_, i) => i !== noteIndex);
    patchMutation.mutate({ id: person._id, notes });
  };

  return (
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef}>
                <ModalHeader
                  icon={<Users className="w-5 h-5 text-[#7C85E0]" />}
                  title={t("peopleNotesModal.title")}
                  subtitle={t("peopleNotesModal.subtitle")}
                  onClose={onClose}
                />

                <ItemAddInput
                  value={newName}
                  onChange={setNewName}
                  onAdd={addPerson}
                  placeholder={t("peopleNotesModal.addPersonPlaceholder")}
                  addLabel={t("peopleNotesModal.addPerson")}
                  disabled={!newName.trim() || createMutation.isPending}
                />

                {/* People List */}
                <div className="p-4 max-h-[400px] overflow-y-auto">
                  {people.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                      <Users className="w-10 h-10 mb-2 opacity-30" />
                      <p>{t("peopleNotesModal.empty")}</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {people.map((person) => (
                          <motion.li
                            key={person._id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="rounded-xl bg-linear-surface border border-white/[0.04] overflow-hidden"
                          >
                            {/* Person header */}
                            <div className="flex items-center gap-3 p-3 hover:bg-linear-surface/80 group transition-all duration-200">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() =>
                                  setExpandedId((prev) =>
                                    prev === person._id ? null : person._id
                                  )
                                }
                                className="p-1 rounded-lg text-slate-500 hover:text-linear-accent-hover transition-all cursor-pointer"
                              >
                                {expandedId === person._id ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </motion.button>

                              {editingNameId === person._id ? (
                                <input
                                  ref={editNameRef}
                                  type="text"
                                  value={editNameValue}
                                  onChange={(e) => setEditNameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditName(person._id);
                                    if (e.key === "Escape") cancelEditName();
                                  }}
                                  onBlur={() => saveEditName(person._id)}
                                  className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-slate-200 font-medium focus:ring-0"
                                />
                              ) : (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleStartEditName(person)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && handleStartEditName(person)
                                  }
                                  className="flex-1 text-slate-200 font-medium cursor-text"
                                >
                                  {person.name}
                                </span>
                              )}

                              {person.notes.length > 0 && expandedId !== person._id && (
                                <span className="text-xs text-[#7C85E0] font-medium">
                                  [{person.notes.length}]
                                </span>
                              )}

                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => deleteMutation.mutate(person._id)}
                                disabled={deleteMutation.isPending}
                                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                                aria-label={t("peopleNotesModal.deletePersonAria")}
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>

                            {/* Expanded notes */}
                            {expandedId === person._id && (
                              <div className="px-4 pb-3 pt-1 space-y-1.5 border-t border-white/[0.04]">
                                {person.notes.map((note, noteIdx) => (
                                  <div
                                    key={noteIdx}
                                    className="flex items-start gap-2 py-1.5 pl-3 rounded-lg"
                                  >
                                    <span className="text-slate-500 mt-0.5 shrink-0">•</span>
                                    <span className="flex-1 text-sm text-slate-300">
                                      {note}
                                    </span>
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => deleteNote(person, noteIdx)}
                                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0 cursor-pointer"
                                      aria-label={t("peopleNotesModal.deleteNoteAria")}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </motion.button>
                                  </div>
                                ))}
                                <div className="flex gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={newNoteText[person._id] ?? ""}
                                    onChange={(e) =>
                                      setNewNoteText((prev) => ({
                                        ...prev,
                                        [person._id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") addNote(person);
                                    }}
                                    placeholder={t("peopleNotesModal.addNotePlaceholder")}
                                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-linear-surface border border-white/[0.04] text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#5E6AD2]/40"
                                  />
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => addNote(person)}
                                    className="px-3 py-2 rounded-lg bg-[#5E6AD2]/20 text-[#7C85E0] text-sm font-medium hover:bg-[#5E6AD2]/30 cursor-pointer"
                                  >
                                    {t("peopleNotesModal.addNote")}
                                  </motion.button>
                                </div>
                              </div>
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </div>
    </ModalContainer>
  );
}
