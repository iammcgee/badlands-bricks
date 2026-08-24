"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { ProductView } from "@/lib/products";
import { useState } from "react";

type Props = {
  product: ProductView;
  planPriceLabel: string;
  hasPlanAccess: boolean;
  signedIn: boolean;
};

export function ProductPurchasePanel({
  product,
  planPriceLabel,
  hasPlanAccess,
  signedIn,
}: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  // Exclusive membership builds: never sold individually.
  if (product.includedInPlan) {
    if (hasPlanAccess && product.downloadFilePath) {
      return (
        <div className="mt-8 max-w-md space-y-3">
          <a
            href={`/api/plan/download/${product.id}`}
            className="block w-full bg-brand-orange px-6 py-4 text-center text-sm font-bold tracking-[0.16em] text-white transition hover:bg-orange-500"
          >
            DOWNLOAD INSTRUCTIONS
          </a>
          <p className="text-xs text-white/50">
            Exclusive membership build — included with your Badlands Plan.
          </p>
        </div>
      );
    }

    return (
      <div className="mt-8 max-w-md space-y-3">
        <Link
          href={signedIn ? "/plan" : "/login?next=%2Fplan"}
          className="block w-full bg-brand-orange px-6 py-4 text-center text-sm font-bold tracking-[0.16em] text-white transition hover:bg-orange-500"
        >
          {signedIn
            ? `JOIN MEMBERSHIP · ${planPriceLabel}`
            : `SIGN IN TO JOIN · ${planPriceLabel}`}
        </Link>
        <p className="text-xs leading-relaxed text-white/50">
          This is a <span className="text-white">members-only</span> build.
          Instructions are delivered exclusively to Badlands Plan members — not
          sold individually.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 max-w-md space-y-3">
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
        className="w-full bg-brand-orange px-6 py-4 text-sm font-bold tracking-[0.16em] text-white transition hover:bg-orange-500"
      >
        {added
          ? "ADDED TO CART"
          : product.priceCents === 0
            ? "GET FREE DOWNLOAD"
            : "ADD TO CART"}
      </button>
      <p className="text-xs text-white/45">
        Digital building instructions delivered after checkout.
      </p>
    </div>
  );
}
