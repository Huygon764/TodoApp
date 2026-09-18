import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { DefaultListModal, type DefaultOrderUpdate } from "@/components/DefaultListModal";
import { DateTemplateModal } from "@/components/DateTemplateModal";
import { RecurringTemplateModal } from "@/components/RecurringTemplateModal";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { ModalHeader } from "@/components/shared/ModalHeader";
import { DefaultListIcon } from "@/components/icons/DefaultListIcon";
import { useModalClose } from "@/hooks/useModalClose";
import type { DefaultItem } from "@/types";

type TemplateTab = "daily" | "date" | "repeat";

interface TemplatesHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultItems: DefaultItem[];
  onAddItem: (title: string, target?: number) => void;
  onInvalidate: () => void;
  onReorder?: (updates: DefaultOrderUpdate[]) => void;
  onDateSaved?: (date: string) => void;
}

export function TemplatesHubModal({
  isOpen,
  onClose,
  defaultItems,
  onAddItem,
  onInvalidate,
  onReorder,
  onDateSaved,
}: TemplatesHubModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TemplateTab>("daily");
  const contentRef = useRef<HTMLDivElement>(null);

  useModalClose(isOpen, onClose, contentRef);

  const tabs: { id: TemplateTab; label: string }[] = [
    { id: "daily", label: t("home.templatesTabDaily", "Daily") },
    { id: "date", label: t("home.templatesTabDate", "Date") },
    { id: "repeat", label: t("home.templatesTabRepeat", "Repeat") },
  ];

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      contentRef={contentRef}
      zBackdrop="z-40"
      zContent="z-50"
    >
      <ModalHeader
        icon={<DefaultListIcon className="w-5 h-5 text-accent-hover" />}
        title={t("home.templatesTitle", "Templates")}
        onClose={onClose}
      />
      <div className="flex border-b border-border-subtle">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === item.id
                ? "text-accent-hover border-b-2 border-accent-primary bg-accent-primary/5"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={tab === "daily" ? "" : "hidden"}>
        <DefaultListModal
          embedded
          isOpen={isOpen}
          onClose={onClose}
          items={defaultItems}
          onAddItem={onAddItem}
          onInvalidate={onInvalidate}
          onReorder={onReorder}
        />
      </div>
      <div className={tab === "date" ? "" : "hidden"}>
        <DateTemplateModal
          embedded
          isOpen={isOpen}
          onClose={onClose}
          onSaved={onDateSaved}
        />
      </div>
      <div className={tab === "repeat" ? "" : "hidden"}>
        <RecurringTemplateModal
          embedded
          isOpen={isOpen}
          onClose={onClose}
          initialTab="week"
        />
      </div>
    </ModalContainer>
  );
}
