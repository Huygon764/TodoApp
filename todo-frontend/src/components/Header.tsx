import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Settings,
  Target,
  Languages,
  FileText,
  Users,
  Menu,
  X,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { useIsMobile } from "@/hooks/useIsMobile";

interface HeaderMenuItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

function HeaderMenuItem({ icon: Icon, label, onClick }: HeaderMenuItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-text-secondary hover:text-white hover:bg-border-subtle transition-colors text-left cursor-pointer"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function AppLogo() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-9 h-9">
        <div className="relative w-full h-full bg-accent-primary rounded-xl flex items-center justify-center shadow-lg shadow-accent-primary/20">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
      </div>
      <span className="text-xl font-bold text-white">{t("appName")}</span>
    </div>
  );
}

export type ModalKey =
  | "default"
  | "recurring"
  | "goal"
  | "review"
  | "reviewHistory"
  | "dateTemplate"
  | "freetime"
  | "peopleNotes";

interface HeaderProps {
  onOpenModal: (key: ModalKey) => void;
  onOpenReview: () => void;
}

export function Header({ onOpenModal, onOpenReview }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const iconHover = isMobile ? undefined : { scale: 1.05 };
  const iconTap = isMobile ? { scale: 0.98 } : { scale: 0.95 };

  const toggleLang = () => {
    const next = i18n.language === "vi" ? "en" : "vi";
    i18n.changeLanguage(next);
    if (typeof localStorage !== "undefined") localStorage.setItem("lang", next);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  const closeMenu = () => setMenuOpen(false);

  const menuAction = (action: () => void) => {
    action();
    closeMenu();
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border-default bg-bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between relative">
        <AppLogo />
        {!isMobile ? (
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={toggleLang}
              className="p-2.5 rounded-xl bg-bg-card border border-border-default text-text-tertiary hover:text-text-secondary hover:border-border-strong transition-all duration-200 cursor-pointer"
              title={i18n.language === "vi" ? "English" : "Tieng Viet"}
            >
              <Languages className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={() => onOpenModal("goal")}
              className="p-2.5 rounded-xl bg-bg-card border border-border-default text-text-tertiary hover:text-accent-hover hover:border-accent-primary/30 transition-all duration-200 cursor-pointer"
              title={t("home.goalsTitle")}
            >
              <Target className="w-5 h-5" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={() => onOpenModal("peopleNotes")}
              className="p-2.5 rounded-xl bg-bg-card border border-border-default text-text-tertiary hover:text-accent-hover hover:border-accent-primary/30 transition-all duration-200 cursor-pointer"
              title={t("peopleNotesModal.title")}
            >
              <Users className="w-5 h-5" />
            </motion.button>
            <motion.button
              type="button"
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={onOpenReview}
              className="p-2.5 rounded-xl bg-bg-card border border-border-default text-text-tertiary hover:text-accent-hover hover:border-accent-primary/30 transition-all duration-200 cursor-pointer"
              title={t("dayTodo.reviewMyself")}
            >
              <FileText className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={iconHover}
              whileTap={iconTap}
              onClick={() => onOpenModal("default")}
              className="p-2.5 rounded-xl bg-bg-card border border-border-default text-text-tertiary hover:text-accent-hover hover:border-accent-primary/30 transition-all duration-200 cursor-pointer"
              title={t("home.defaultTemplateTitle")}
            >
              <Settings className="w-5 h-5" />
            </motion.button>
            <LogoutButton />
          </div>
        ) : (
          <div ref={menuRef} className="relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setMenuOpen((prev) => !prev)}
              className="p-2.5 rounded-xl bg-bg-card border border-border-default text-text-secondary hover:text-white transition-colors duration-200 cursor-pointer"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute right-0 top-[calc(100%+0.75rem)] w-64 rounded-2xl bg-bg-card border border-border-default shadow-2xl shadow-black/30 p-2 z-30"
                >
                  <HeaderMenuItem
                    icon={Languages}
                    label={i18n.language === "vi" ? "English" : "Tieng Viet"}
                    onClick={() => menuAction(toggleLang)}
                  />
                  <HeaderMenuItem
                    icon={Target}
                    label={t("home.goalsTitle")}
                    onClick={() => menuAction(() => onOpenModal("goal"))}
                  />
                  <HeaderMenuItem
                    icon={Users}
                    label={t("peopleNotesModal.title")}
                    onClick={() => menuAction(() => onOpenModal("peopleNotes"))}
                  />
                  <HeaderMenuItem
                    icon={FileText}
                    label={t("dayTodo.reviewMyself")}
                    onClick={() => menuAction(onOpenReview)}
                  />
                  <HeaderMenuItem
                    icon={Settings}
                    label={t("home.defaultTemplateTitle")}
                    onClick={() => menuAction(() => onOpenModal("default"))}
                  />
                  <div className="my-1 h-px bg-border-default" />
                  <LogoutButton variant="menu" onAfterClick={closeMenu} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
