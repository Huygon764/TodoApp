import { FeatureIcon } from "./FeatureIcon";
import src from "./goals.svg";

interface GoalsIconProps {
  className?: string;
}

/** Renders the Goals mark. Edit `goals.svg` to change the drawing. */
export function GoalsIcon({ className }: GoalsIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
