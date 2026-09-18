import { FeatureIcon } from "./FeatureIcon";
import src from "./expense.svg";

interface ExpenseIconProps {
  className?: string;
}

/** Renders the Expense mark. Edit `expense.svg` to change the drawing. */
export function ExpenseIcon({ className }: ExpenseIconProps) {
  return <FeatureIcon src={src} className={className} />;
}
