export function Hero({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold">{title}</h1>
      {subtitle ? (
        <p className="text-[length:var(--font-size-md)] text-[color:var(--color-fg-muted)]">
          {subtitle}
        </p>
      ) : null}
    </section>
  );
}
