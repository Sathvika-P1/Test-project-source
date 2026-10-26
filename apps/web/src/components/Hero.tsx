export function Hero({ title }: { title: string }) {
  return (
    <section className="p-8">
      <h1 className="text-3xl font-bold">{title}</h1>
    </section>
  );
}
