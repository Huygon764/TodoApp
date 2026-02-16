import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface DateNavProps {
  date: string;
  onDateChange: (date: string) => void;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return "Hôm nay";
  if (isYesterday) return "Hôm qua";
  if (isTomorrow) return "Ngày mai";

  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function DateNav({ date, onDateChange }: DateNavProps) {
  return (
    <div className="relative">
      {/* Card glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-2xl blur-xl opacity-50" />
      
      <div className="relative flex items-center gap-3 p-2 rounded-2xl bg-slate-800/50 border border-white/[0.06] backdrop-blur-sm">
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-emerald-400 border border-white/[0.04] hover:border-emerald-500/30 transition-all duration-200"
          onClick={() => onDateChange(addDays(date, -1))}
          aria-label="Ngày trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <div className="flex-1 flex justify-center">
          <label className="relative block w-full max-w-[240px] group cursor-pointer">
            <span className="sr-only">Chọn ngày</span>
            
            {/* Hidden input - chỉ dùng để trigger date picker */}
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            {/* Custom display */}
            <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-slate-700/50 border border-white/[0.04] group-hover:border-slate-600 transition-all duration-200">
              <Calendar className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              <span className="text-slate-200 font-medium">{formatDisplayDate(date)}</span>
            </div>
          </label>
        </div>

        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-emerald-400 border border-white/[0.04] hover:border-emerald-500/30 transition-all duration-200"
          onClick={() => onDateChange(addDays(date, 1))}
          aria-label="Ngày sau"
        >
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
