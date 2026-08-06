"use client";

import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { ProductView } from "@/lib/products";

export function AddToCartButton({ product }: { product: ProductView }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
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
      {added ? "ADDED TO CART" : "ADD TO CART"}
    </button>
  );
}
