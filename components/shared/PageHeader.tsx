import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Reusable page-level header with editorial title, optional subtitle, and action slot.
 * Used at the top of every main page.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between", className)}>
      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-foreground text-2xl font-medium">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="ml-4 flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
