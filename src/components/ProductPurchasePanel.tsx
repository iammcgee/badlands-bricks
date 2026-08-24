"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { ProductView } from "@/lib/products";

type Props = {
  product: ProductView;
  planPriceLabel: string;
  hasPlanAccess: boolean;
};

export function ProductPurchasePanel({
  product,
  planPriceLabel,
  hasPlanAccess,
}: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div className="mt-8 max-w-md space-y-3">
      {hasPlanAccess && product.includedInPlan && product.downloadFilePath ? (
        <a
          href={`/api/plan/download/${product.id}`}
          className="block w-full bg-brand-orange px-6 py-4 text-center text-sm font-bold tracking-[0.16em] text-white transition hover:bg-orange-500"
        >
          DOWNLOAD WITH PLAN
        </a>
      ) : null}

      <button
        type="button"
        onClick={() => {
          addItem({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.priceCents,
            image: product.images[0] || "/products/placeholder.svg",
          });
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1600);
        }}
        className="w-full border border-white/25 bg-transparent px-6 py-4 text-sm font-bold tracking-[0.16em] text-white transition hover:border-brand-orange hover:text-brand-orange"
      >
        {added
          ? "ADDED TO CART"
          : product.priceCents === 0
            ? "GET FREE DOWNLOAD"
            : "BUY INDIVIDUALLY"}
      </button>

      {product.includedInPlan && !hasPlanAccess ? (
        <p className="text-xs leading-relaxed text-white/50">
          Included in the{" "}
          <Link href="/plan" className="text-brand-orange hover:underline">
            Badlands Plan
          </Link>{" "}
          ({planPriceLabel}) — unlock this and other plan builds with one
          subscription.
        </p>
      ) : null}

      {product.includedInPlan && hasPlanAccess ? (
        <p className="text-xs text-white/50">
          This build is part of your Badlands Plan. Individual purchase still
          works if you want a one-time download link.
        </p>
      ) : null}
    </div>
  );
}
