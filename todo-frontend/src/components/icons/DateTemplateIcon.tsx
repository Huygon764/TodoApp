import { FeatureIcon } from "./FeatureIcon";
import src from "./date-template.svg";

interface DateTemplateIconProps {
  className?: string;
}

/** Renders the Date template mark. Edit `date-template.svg` to change the drawing. */
export function DateTemplateIcon({ className }: DateTemplateIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
