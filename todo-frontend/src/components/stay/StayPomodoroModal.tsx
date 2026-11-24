import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { ModalContainer } from "@/components/shared/ModalContainer";
import { useModalClose } from "@/hooks/useModalClose";
import { useStay } from "@/hooks/useStay";
import { usePomodoro } from "@/hooks/usePomodoro";
import {
  StateDot,
  pomodoroDotState,
  stayDotState,
  type DotState,
} from "@/components/stay/StateDot";
import { StayTab } from "@/components/stay/StayTab";
import { PomodoroTab } from "@/components/stay/PomodoroTab";

export type TimerTab = "stay" | "pomodoro";

interface StayPomodoroModalProps {
  isOpen: boolean;
  onClose: () => void;
  tab: TimerTab;
  onTabChange: (tab: TimerTab) => void;
}

export function StayPomodoroModal({ isOpen, onClose, tab, onTabChange }: StayPomodoroModalProps) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  useModalClose(isOpen, onClose, contentRef);
  // Dots come from the stored statuses, not a ticking clock: this modal stays
  // mounted after first use and must not re-render every second.
  const stayState = useStay().state;
  const pomodoroState = usePomodoro().state;

  const tabs: { key: TimerTab; label: string; dot: DotState }[] = [
    { key: "stay", label: t("stay.name"), dot: stayDotState(stayState?.today.status ?? "idle") },
    { key: "pomodoro", label: t("pomodoro.name"), dot: pomodoroDotState(pomodoroState) },
  ];

  return (
    <ModalContainer
      isOpen={isOpen}
      onClose={onClose}
      contentRef={contentRef}
      maxWidth="max-w-[440px]"
      fullScreenOnMobile
    >
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle">
        <div className="flex flex-1 gap-1" role="tablist">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex items-center gap-[7px] px-3 py-[7px] rounded-lg text-sm font-medium transition-colors ${
                tab === item.key
                  ? "bg-bg-elevated text-white"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              <StateDot state={item.dot} />
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="p-2 rounded-xl text-text-tertiary hover:text-white hover:bg-bg-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-5">{tab === "stay" ? <StayTab /> : <PomodoroTab />}</div>
    </ModalContainer>
  );
}
