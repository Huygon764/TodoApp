import { useTranslation } from "react-i18next";

interface OrbitLockupProps {
  size?: "sm" | "lg";
  className?: string;
}

const SIZE = {
  sm: { mark: "w-9 h-9", word: "text-xl" },
  lg: { mark: "w-12 h-12 sm:w-14 sm:h-14", word: "text-2xl sm:text-3xl" },
} as const;

/** Brand lockup: planet mark stands in for the O, then "rbit". */
export function OrbitLockup({ size = "sm", className = "" }: OrbitLockupProps) {
  const { t } = useTranslation();
  const name = t("appName");
  const { mark, word } = SIZE[size];

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`.trim()}
      role="img"
      aria-label={name}
    >
      <img
        src="/logo.svg"
        alt=""
        draggable={false}
        aria-hidden="true"
        className={`${mark} select-none`}
      />
      <span aria-hidden="true" className={`${word} font-bold text-white tracking-tight`}>
        {name.slice(1)}
      </span>
    </div>
  );
}
