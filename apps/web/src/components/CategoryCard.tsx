import Link from "next/link";
import type { Category } from "@/lib/catalogue";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <li
      data-testid="category-card"
      className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-[var(--space-3)]"
    >
      <Link
        href={`/categories/${category.slug}`}
        className="text-[length:var(--font-size-md)] text-[color:var(--color-fg)]"
      >
        {category.name}
      </Link>
    </li>
  );
}

export function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(var(--size-grid-min),1fr))] gap-[var(--space-3)]">
      {categories.map((c) => (
        <CategoryCard key={c.id} category={c} />
      ))}
    </ul>
  );
}
