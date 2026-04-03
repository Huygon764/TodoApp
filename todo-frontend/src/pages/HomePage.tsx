import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ListTodo, CalendarRange, Calendar, Circle } from "lucide-react";
import { API_PATHS } from "@/constants/api";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import type { DayTodo, DayTodoItem, DefaultItem, User } from "@/types";
import { getTodayInTimezone } from "@/lib/datePeriod";
import { DateNav } from "@/components/DateNav";
import { DayTodoList } from "@/components/DayTodoList";
import { DefaultListModal, type DefaultOrderUpdate } from "@/components/DefaultListModal";
import { RecurringTemplateModal } from "@/components/RecurringTemplateModal";
import { GoalModal } from "@/components/GoalModal";
import { ReviewModal } from "@/components/ReviewModal";
import { ReviewHistoryModal } from "@/components/ReviewHistoryModal";
import { DateTemplateModal } from "@/components/DateTemplateModal";
import { FreetimeTodoModal } from "@/components/FreetimeTodoModal";
import { PeopleNotesModal } from "@/components/PeopleNotesModal";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Header, type ModalKey } from "@/components/Header";
import { SectionCard } from "@/components/SectionCard";
import { useIsMobile } from "@/hooks/useIsMobile";

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-bg-page" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />
      <ParticleBackground />
    </div>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const res = await apiGet<{ user: User }>(API_PATHS.AUTH_ME);
      return res.data?.user ?? null;
    },
    retry: false,
  });

  const [selectedDate, setSelectedDate] = useState(() => getTodayInTimezone());
  const hasInitializedDate = useRef(false);
  useEffect(() => {
    if (user && !hasInitializedDate.current) {
      hasInitializedDate.current = true;
      setSelectedDate(getTodayInTimezone(user.timezone));
    }
  }, [user]);

  const [openModal, setOpenModal] = useState<ModalKey | null>(null);
  const openM = (key: ModalKey) => setOpenModal(key);
  const closeM = () => setOpenModal(null);
  const [reviewModalSlot, setReviewModalSlot] = useState<{
    type: "week" | "month";
    period: string;
  } | null>(null);

  // Queries
  const { data: dayData, isLoading: dayLoading } = useQuery({
    queryKey: ["day", selectedDate],
    queryFn: async () => {
      const res = await apiGet<{ dayTodo: DayTodo }>(API_PATHS.DAY(selectedDate));
      return res.data?.dayTodo ?? null;
    },
  });

  const { data: defaultData } = useQuery({
    queryKey: ["default"],
    queryFn: async () => {
      const res = await apiGet<{ items: DefaultItem[] }>(API_PATHS.DEFAULT);
      return res.data?.items ?? [];
    },
  });

  // Mutations
  const patchDayMutation = useMutation({
    mutationFn: (items: DayTodoItem[]) =>
      apiPatch<{ dayTodo: DayTodo }>(API_PATHS.DAY(selectedDate), { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day", selectedDate] });
    },
  });

  const addDefaultMutation = useMutation({
    mutationFn: (title: string) =>
      apiPost<{ item: DefaultItem }>(API_PATHS.DEFAULT, {
        title,
        order: defaultData?.length ?? 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default"] });
    },
  });

  const reorderDefaultMutation = useMutation({
    mutationFn: (updates: DefaultOrderUpdate[]) =>
      Promise.all(
        updates.map((u) => apiPatch(API_PATHS.DEFAULT_BY_ID(u.id), { order: u.order }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["default"] });
    },
  });

  const dayTodo = dayData ?? null;
  const defaultItems = defaultData ?? [];

  const getSectionMotion = (desktopDelay = 0) => ({
    initial: isMobile ? { opacity: 0, y: 4 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: isMobile
      ? { duration: 0.18, ease: "easeOut" }
      : { duration: 0.3, delay: desktopDelay },
  });

  const handleOpenReview = () => {
    setReviewModalSlot(null);
    openM("review");
  };

  return (
    <div className="min-h-screen text-slate-100 relative">
      <AnimatedBackground />

      <Header onOpenModal={openM} onOpenReview={handleOpenReview} />

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-6 space-y-6">
        <motion.section {...getSectionMotion()}>
          <DateNav
            date={selectedDate}
            onDateChange={setSelectedDate}
            timezone={user?.timezone}
          />
        </motion.section>

        <motion.section {...getSectionMotion(0.05)} className="flex-1">
          <DayTodoList
            dayTodo={dayTodo}
            isLoading={dayLoading}
            onUpdateItems={(items) => patchDayMutation.mutate(items)}
          />
        </motion.section>

        <motion.section {...getSectionMotion(0.1)}>
          <SectionCard
            icon={ListTodo}
            title={t("home.templateDefault")}
            description={t("home.defaultTemplateDesc", { count: defaultItems.length })}
            onClick={() => openM("default")}
          />
        </motion.section>

        <motion.section {...getSectionMotion(0.12)}>
          <SectionCard
            icon={Calendar}
            title={t("home.dateTemplateTitle")}
            description={t("home.dateTemplateDesc")}
            onClick={() => openM("dateTemplate")}
          />
        </motion.section>

        <motion.section {...getSectionMotion(0.14)}>
          <SectionCard
            icon={Circle}
            title={t("freetimeModal.title", "Freetime list")}
            description={t("freetimeModal.subtitle", "Things you want to do when you have free time")}
            onClick={() => openM("freetime")}
          />
        </motion.section>

        <motion.section {...getSectionMotion(0.15)}>
          <SectionCard
            icon={CalendarRange}
            title={t("home.recurringTemplateTitle")}
            description={t("home.recurringTemplateDesc")}
            onClick={() => openM("recurring")}
          />
        </motion.section>
      </main>

      {/* Modals */}
      <DefaultListModal
        isOpen={openModal === "default"}
        onClose={closeM}
        items={defaultItems}
        onAddItem={(title) => addDefaultMutation.mutate(title)}
        onInvalidate={() => queryClient.invalidateQueries({ queryKey: ["default"] })}
        onReorder={(updates) => updates.length > 0 && reorderDefaultMutation.mutate(updates)}
      />
      <DateTemplateModal
        isOpen={openModal === "dateTemplate"}
        onClose={closeM}
        onSaved={(date) => {
          if (date === selectedDate) {
            queryClient.invalidateQueries({ queryKey: ["day", selectedDate] });
          }
        }}
      />
      <FreetimeTodoModal isOpen={openModal === "freetime"} onClose={closeM} />
      <RecurringTemplateModal
        isOpen={openModal === "recurring"}
        onClose={closeM}
        initialTab="week"
      />
      <GoalModal isOpen={openModal === "goal"} onClose={closeM} />
      <ReviewModal
        isOpen={openModal === "review"}
        onClose={() => {
          closeM();
          setReviewModalSlot(null);
        }}
        type={reviewModalSlot?.type}
        period={reviewModalSlot?.period}
        onOpenHistory={() => {
          setReviewModalSlot(null);
          openM("reviewHistory");
        }}
      />
      <PeopleNotesModal isOpen={openModal === "peopleNotes"} onClose={closeM} />
      <ReviewHistoryModal
        isOpen={openModal === "reviewHistory"}
        onClose={closeM}
        onOpenSlot={(type, period) => {
          setReviewModalSlot({ type, period });
          openM("review");
        }}
      />
    </div>
  );
}
