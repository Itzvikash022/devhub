import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Consistent empty state used by every module.
 * Shows an icon, title, description, and optional CTA button.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center", className)}>
      <div className="bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground h-5 w-5" />
      </div>
      <h3 className="text-foreground mb-1 text-sm font-medium">{title}</h3>
      <p className="text-muted-foreground mb-5 max-w-xs text-sm">{description}</p>
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
