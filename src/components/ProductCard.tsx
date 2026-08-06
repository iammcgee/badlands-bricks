import Link from "next/link";
import { formatPrice, ProductView } from "@/lib/products";

export function ProductCard({ product }: { product: ProductView }) {
  const image = product.images[0] || "/products/placeholder.svg";

  return (
    <Link href={`/build/${product.slug}`} className="group block">
      <div className="aspect-[4/3] overflow-hidden bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-3 text-center">
        <h3 className="font-display text-xl tracking-[0.08em] text-white">
          {product.name.toUpperCase()}
        </h3>
        <p className="mt-1 text-sm text-white/80">
          {formatPrice(product.priceCents)}
        </p>
      </div>
    </Link>
  );
}
