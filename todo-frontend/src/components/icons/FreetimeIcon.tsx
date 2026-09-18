import { FeatureIcon } from "./FeatureIcon";
import src from "./freetime.svg";

interface FreetimeIconProps {
  className?: string;
}

/** Renders the Freetime mark. Edit `freetime.svg` to change the drawing. */
export function FreetimeIcon({ className }: FreetimeIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
