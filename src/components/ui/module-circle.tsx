import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ModuleCircleProps {
  id: string;
  title: string;
  icon: LucideIcon;
  href: string;
  color?: "primary" | "warning" | "success" | "secondary";
  isDragging?: boolean;
}

export const ModuleCircle = ({
  id,
  title,
  icon: Icon,
  href,
  color = "primary",
  isDragging,
}: ModuleCircleProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
    secondary: "bg-secondary/10 text-secondary-foreground border-secondary/20",
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col items-center gap-2",
        isCurrentlyDragging && "opacity-50"
      )}
    >
      <Link
        to={href}
        className={cn(
          "w-16 h-16 rounded-full border-2 flex items-center justify-center",
          "transition-all duration-200 active:scale-95",
          "hover:shadow-lg hover:scale-105",
          colorClasses[color]
        )}
        {...attributes}
        {...listeners}
      >
        <Icon className="h-7 w-7" />
      </Link>
      <span className="text-xs text-center text-foreground/80 font-medium line-clamp-2 w-20">
        {title}
      </span>
    </div>
  );
};
