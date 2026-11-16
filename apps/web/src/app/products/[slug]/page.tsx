import Image from "next/image";
import { notFound } from "next/navigation";
import { formatPrice } from "@/components/ProductCard";
import { getProduct } from "@/lib/catalogue";
import { buildMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  return buildMetadata({
    title: product?.name ?? "Product",
    description: product?.description ?? "",
    path: `/products/${slug}`,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  return (
    <main className="mx-auto max-w-[var(--size-container)] p-[var(--space-3)]">
      <h1 className="text-[length:var(--font-size-xl)] text-[color:var(--color-fg)]">
        {product.name}
      </h1>
      {product.imageUrl ? (
        <Image src={product.imageUrl} alt={product.name} width={480} height={480} unoptimized />
      ) : null}
      <p className="text-[length:var(--font-size-md)] text-[color:var(--color-fg-muted)]">
        {product.brand}
      </p>
      <p className="text-[length:var(--font-size-lg)] text-[color:var(--color-fg)]">
        {formatPrice(product.priceCents, product.currency)}
      </p>
      <p className="text-[length:var(--font-size-md)] text-[color:var(--color-fg)]">
        {product.description}
      </p>
    </main>
  );
}
