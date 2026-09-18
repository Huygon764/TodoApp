import { FeatureIcon } from "./FeatureIcon";
import src from "./review.svg";

interface ReviewIconProps {
  className?: string;
}

/** Renders the Review mark. Edit `review.svg` to change the drawing. */
export function ReviewIcon({ className }: ReviewIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
