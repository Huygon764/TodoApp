import { FeatureIcon } from "./FeatureIcon";
import src from "./default-list.svg";

interface DefaultListIconProps {
  className?: string;
}

/** Renders the Default list mark. Edit `default-list.svg` to change the drawing. */
export function DefaultListIcon({ className }: DefaultListIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
