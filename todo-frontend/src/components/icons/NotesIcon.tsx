import { FeatureIcon } from "./FeatureIcon";
import src from "./notes.svg";

interface NotesIconProps {
  className?: string;
}

/** Renders the Notes mark. Edit `notes.svg` to change the drawing. */
export function NotesIcon({ className }: NotesIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
