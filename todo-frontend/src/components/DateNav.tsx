import { motion } from "framer-motion";

interface DateNavProps {
  date: string;
  onDateChange: (date: string) => void;
}

function addDays(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function DateNav({ date, onDateChange }: DateNavProps) {
  return (
    <div className="flex items-center gap-3">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 transition"
        onClick={() => onDateChange(addDays(date, -1))}
        aria-label="Ngày trước"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </motion.button>

      <div className="flex-1 flex justify-center">
        <label className="block w-full max-w-[200px]">
          <span className="sr-only">Chọn ngày</span>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-100 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 transition"
        onClick={() => onDateChange(addDays(date, 1))}
        aria-label="Ngày sau"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>
    </div>
  );
}
