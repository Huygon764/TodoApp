import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Settings, Download, Upload, Check } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost } from "@/lib/api";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useModalClose } from "@/hooks/useModalClose";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** YYYY-MM-DD without pulling in a date library. */
function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function downloadJson(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<unknown | null>(null);
  useModalClose(isOpen, onClose, contentRef);

  const setLang = (lang: "vi" | "en") => {
    i18n.changeLanguage(lang);
    if (typeof localStorage !== "undefined") localStorage.setItem("lang", lang);
  };

  const doExport = async () => {
    const res = await apiGet<unknown>(API_PATHS.DATA_EXPORT);
    downloadJson(res.data, `todo-backup-${todayStamp()}.json`);
  };

  const onFileChosen = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setError(null);
    try {
      const payload = JSON.parse(await file.text());
      setPending(payload); // opens the confirm dialog
    } catch {
      setError(t("settings.importInvalid", "That file is not valid JSON."));
    }
  };

  const runImport = async () => {
    const payload = pending;
    setPending(null);
    if (payload == null) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost(API_PATHS.DATA_IMPORT, payload);
      queryClient.invalidateQueries(); // reload every query after a full replace
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch {
      setError(t("settings.importFailed", "Import failed. Your data was not changed."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <ModalContainer isOpen={isOpen} onClose={onClose} contentRef={contentRef}>
      <ModalHeader
        icon={<Settings className="w-5 h-5 text-accent-hover" />}
        title={t("settings.title")}
        subtitle={t("settings.subtitle")}
        onClose={onClose}
      />

      <div className="p-5 space-y-6">
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">
            {t("settings.language")}
          </p>
          <div className="flex gap-2">
            {(["vi", "en"] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLang(lang)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  i18n.language === lang
                    ? "bg-accent-primary text-white border-accent-primary"
                    : "bg-bg-surface text-text-secondary border-border-subtle hover:border-border-strong"
                }`}
              >
                {lang === "vi" ? "Tieng Viet" : "English"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-border-subtle">
          <button
            type="button"
            onClick={doExport}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border-subtle hover:border-accent-primary/40 transition-colors cursor-pointer text-left"
          >
            <Download className="w-5 h-5 text-accent-hover shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text-secondary">
                {t("settings.export")}
              </span>
              <span className="block text-xs text-text-muted">
                {t("settings.exportHint")}
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border-subtle hover:border-danger/40 transition-colors cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-5 h-5 text-danger shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text-secondary">
                {busy
                  ? t("settings.importing")
                  : done
                    ? t("settings.importDone")
                    : t("settings.import")}
              </span>
              <span className="block text-xs text-text-muted">
                {t("settings.importHint")}
              </span>
            </span>
            {done && <Check className="w-5 h-5 text-success shrink-0 ml-auto" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFileChosen}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>
    </ModalContainer>

      <ConfirmDialog
        isOpen={pending != null}
        danger
        title={t("settings.import")}
        message={t("settings.importConfirm")}
        confirmLabel={t("settings.importConfirmBtn", "Replace data")}
        onConfirm={runImport}
        onClose={() => setPending(null)}
      />
    </>
  );
}
