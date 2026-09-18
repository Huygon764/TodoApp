import { FeatureIcon } from "./FeatureIcon";
import src from "./recurring.svg";

interface RecurringIconProps {
  className?: string;
}

/** Renders the Recurring mark. Edit `recurring.svg` to change the drawing. */
export function RecurringIcon({ className }: RecurringIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
