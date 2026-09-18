interface FeatureIconProps {
  src: string;
  className?: string;
}

/** Renders a standalone .svg. Edit the .svg to change the drawing. */
export function FeatureIcon({ src, className }: FeatureIconProps) {
  return <img src={src} alt="" draggable={false} className={className} />;
}
