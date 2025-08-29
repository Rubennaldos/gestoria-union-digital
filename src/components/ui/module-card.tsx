import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color?: "primary" | "warning" | "success" | "secondary";
  badge?: string;
  className?: string;
}

export const ModuleCard = ({
  title,
  description,
  icon: Icon,
  href,
  color = "primary",
  badge,
  className,
}: ModuleCardProps) => {
  const colorClasses = {
    primary: "text-primary bg-primary-light border-primary/20 hover:border-primary/40",
    warning: "text-warning bg-warning-light border-warning/20 hover:border-warning/40",
    success: "text-success bg-success-light border-success/20 hover:border-success/40",
    secondary: "text-secondary-foreground bg-secondary border-secondary hover:border-secondary-hover",
  };

  return (
    <Link to={href} className="block group">
      <Card className={cn(
        "relative p-6 transition-all duration-200 hover:shadow-lg border-2",
        "hover:scale-[1.02] hover:bg-card-hover",
        "min-h-[140px] flex flex-col justify-between",
        colorClasses[color],
        className
      )}>
        {badge && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning text-warning-foreground">
              {badge}
            </span>
          </div>
        )}
        
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-2 line-clamp-2">
              {title}
            </h3>
            <p className="text-sm opacity-80 line-clamp-2">
              {description}
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-end">
          <span className="text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">
            Ver módulo →
          </span>
        </div>
      </Card>
    </Link>
  );
};