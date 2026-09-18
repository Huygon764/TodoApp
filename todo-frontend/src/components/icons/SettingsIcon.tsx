import { FeatureIcon } from "./FeatureIcon";
import src from "./settings.svg";

interface SettingsIconProps {
  className?: string;
}

/** Renders the Settings mark. Edit `settings.svg` to change the drawing. */
export function SettingsIcon({ className }: SettingsIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
