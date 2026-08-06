import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGallery } from "@/components/ProductGallery";
import { prisma } from "@/lib/prisma";
import { formatPrice, toProductView } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  return { title: product?.name || "Build" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const record = await prisma.product.findUnique({ where: { slug } });
  if (!record || !record.isActive) notFound();

  const product = toProductView(record);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="mb-6 text-xs tracking-[0.14em] text-white/60">
        <Link href="/build" className="hover:text-brand-orange">
          BUILD
        </Link>{" "}
        › {product.name}
      </p>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white md:text-6xl">
            {product.name.toUpperCase()}
          </h1>
          <p className="mt-3 text-xl text-white/90">
            {formatPrice(product.priceCents)}
          </p>
          <p className="mt-6 max-w-xl leading-relaxed text-white/75">
            {product.description}
          </p>
          <div className="mt-8 max-w-md">
            <AddToCartButton product={product} />
          </div>
          <p className="mt-4 text-xs text-white/45">
            Digital building instructions delivered after checkout.
          </p>
        </div>
      </div>
    </div>
  );
}
