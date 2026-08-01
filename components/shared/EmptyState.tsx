import type { LucideIcon } from "lucide-react";

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
 * Uses reference design tokens for full visual consistency.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 text-center ${className ?? ""}`}
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: "var(--accent-dim)" }}
      >
        <Icon className="h-5 w-5" style={{ color: "var(--accent-color)" }} />
      </div>
      <h3
        className="mb-1 font-heading text-[16px] font-medium"
        style={{ color: "var(--text)" }}
      >
        {title}
      </h3>
      <p
        className="mb-5 max-w-xs font-inter text-[13px]"
        style={{ color: "var(--text-dim)" }}
      >
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1.5 rounded-md px-4 py-2 font-inter text-sm transition-colors"
          style={{ backgroundColor: "var(--accent-color)", color: "#fff" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#4338a8"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "var(--accent-color)"; }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
