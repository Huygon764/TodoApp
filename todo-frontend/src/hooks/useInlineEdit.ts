import { useState, useRef, useEffect } from "react";

export function useInlineEdit<T extends string | number = string>() {
  const [editingId, setEditingId] = useState<T | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId !== null) editInputRef.current?.focus();
  }, [editingId]);

  const startEdit = (id: T, currentValue: string) => {
    setEditingId(id);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const finishEdit = (): string | null => {
    const trimmed = editValue.trim();
    setEditingId(null);
    setEditValue("");
    return trimmed || null;
  };

  return { editingId, editValue, setEditValue, editInputRef, startEdit, cancelEdit, finishEdit };
}
