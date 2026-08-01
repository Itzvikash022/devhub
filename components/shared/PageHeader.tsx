interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Reusable section-level header inside a page (NOT the topbar).
 * Uses reference design tokens for font/color consistency.
 */
export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={`flex items-start justify-between ${className ?? ""}`}>
      <div className="min-w-0 flex-1">
        <h2
          className="font-heading text-[17px] font-medium leading-tight"
          style={{ color: "var(--text)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 font-inter text-[13px]" style={{ color: "var(--text-dim)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="ml-4 flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
