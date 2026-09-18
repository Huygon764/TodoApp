import { FeatureIcon } from "./FeatureIcon";
import src from "./habits.svg";

interface HabitsIconProps {
  className?: string;
}

/** Renders the Habits mark. Edit `habits.svg` to change the drawing. */
export function HabitsIcon({ className }: HabitsIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
