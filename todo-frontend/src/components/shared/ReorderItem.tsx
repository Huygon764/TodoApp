import { forwardRef } from "react";
import type { ReactNode } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";

interface ReorderItemProps<T> {
  item: T;
  isMobile: boolean;
  children: (dragHandle: ReactNode) => ReactNode;
  layoutId?: string;
}

// Use generic with forwardRef workaround
function ReorderItemInner<T>(
  { item, isMobile, children, layoutId }: ReorderItemProps<T>,
  ref: React.ForwardedRef<HTMLLIElement>
) {
  const dragControls = useDragControls();

  const dragHandle = (
    <button
      type="button"
      onPointerDown={(e) => dragControls.start(e)}
      className="shrink-0 p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-bg-surface transition-all duration-200 cursor-grab active:cursor-grabbing touch-none"
      aria-label="Reorder item"
    >
      <GripVertical className="w-4 h-4" />
    </button>
  );

  return (
    <Reorder.Item
      ref={ref}
      value={item}
      initial={{ opacity: 0, y: isMobile ? -8 : -20 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: isMobile
          ? { duration: 0.16, ease: "easeOut" }
          : { type: "spring", stiffness: 100, damping: 25 },
      }}
      exit={{
        opacity: 0,
        x: isMobile ? -40 : -100,
        transition: { duration: isMobile ? 0.12 : 0.2 },
      }}
      layout
      layoutId={layoutId}
      dragListener={false}
      dragControls={dragControls}
      className="group"
    >
      {children(dragHandle)}
    </Reorder.Item>
  );
}

export const ReorderItem = forwardRef(ReorderItemInner) as <T>(
  props: ReorderItemProps<T> & { ref?: React.Ref<HTMLLIElement> }
) => React.ReactElement | null;
