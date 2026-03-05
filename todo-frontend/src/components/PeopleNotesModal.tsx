import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Users, ChevronDown, ChevronRight } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import type { PersonNote } from "@/types";

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
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const editNameRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (editingNameId) editNameRef.current?.focus();
  }, [editingNameId]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (contentRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  const addPerson = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed);
    setNewName("");
  };

  const startEditName = (person: PersonNote) => {
    setEditingNameId(person._id);
    setEditNameValue(person.name);
  };

  const saveEditName = (id: string) => {
    const trimmed = editNameValue.trim();
    setEditingNameId(null);
    setEditNameValue("");
    if (!trimmed) return;
    patchMutation.mutate({ id, name: trimmed });
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
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg" ref={contentRef}>
              <div className="relative bg-linear-card rounded-3xl border border-white/[0.06] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#5E6AD2]/10">
                      <Users className="w-5 h-5 text-[#7C85E0]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {t("peopleNotesModal.title")}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {t("peopleNotesModal.subtitle")}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-linear-surface transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Add Person Input */}
                <div className="p-4 border-b border-white/[0.04]">
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Plus className="w-5 h-5 text-slate-500 group-focus-within:text-linear-accent-hover transition-colors" />
                      </div>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addPerson()}
                        placeholder={t("peopleNotesModal.addPersonPlaceholder")}
                        className="w-full pl-12 pr-4 py-3 rounded-xl bg-linear-surface border border-white/[0.04] text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/40 focus:border-[#5E6AD2]/50 hover:border-white/[0.1] transition-all duration-200"
                      />
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={addPerson}
                      disabled={!newName.trim() || createMutation.isPending}
                      className="px-5 py-3 rounded-xl bg-linear-accent hover:bg-linear-accent-hover text-white font-semibold transition-all duration-200 shadow-lg shadow-[#5E6AD2]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("peopleNotesModal.addPerson")}
                    </motion.button>
                  </div>
                </div>

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
                                    if (e.key === "Escape") {
                                      setEditingNameId(null);
                                      setEditNameValue("");
                                    }
                                  }}
                                  onBlur={() => saveEditName(person._id)}
                                  className="flex-1 min-w-0 px-0 py-0.5 bg-transparent border-none outline-none text-slate-200 font-medium focus:ring-0"
                                />
                              ) : (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => startEditName(person)}
                                  onKeyDown={(e) =>
                                    e.key === "Enter" && startEditName(person)
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
                                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-50"
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
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
