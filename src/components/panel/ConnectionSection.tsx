interface ConnectionSectionProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}

export function ConnectionSection({
  title,
  icon,
  count,
  children,
}: ConnectionSectionProps) {
  if (count === 0) return null;

  return (
    <section className="border-t border-[var(--color-border)] px-5 py-4">
      <header className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-fg-muted)]">
          <span className="text-[var(--color-fg-subtle)]">{icon}</span>
          {title}
        </h3>
        <span className="text-[10px] font-medium tabular-nums text-[var(--color-fg-subtle)]">
          {count}
        </span>
      </header>
      {children}
    </section>
  );
}
