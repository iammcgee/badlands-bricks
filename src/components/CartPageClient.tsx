"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";

export function CartPageClient() {
  const { items, subtotalCents, setQuantity, removeItem } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <h1 className="font-display text-4xl tracking-[0.08em] text-white">
          YOUR CART
        </h1>
        <p className="mt-4 text-white/70">No builds in the cart yet.</p>
        <Link
          href="/build"
          className="mt-8 inline-block bg-brand-orange px-6 py-3 text-sm font-bold tracking-[0.14em] text-white"
        >
          SHOP ALL MOCS
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
        YOUR CART
      </h1>

      <div className="mt-10 space-y-4">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex flex-col gap-4 border border-white/15 p-4 sm:flex-row sm:items-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.image}
              alt={item.name}
              className="h-24 w-32 object-cover"
            />
            <div className="flex-1">
              <h2 className="font-display text-xl tracking-[0.06em] text-white">
                {item.name.toUpperCase()}
              </h2>
              <p className="mt-1 text-white/70">
                {formatPrice(item.priceCents)}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-white">
              Qty
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(event) =>
                  setQuantity(item.productId, Number(event.target.value) || 1)
                }
                className="w-16 border border-white/25 bg-neutral-900 px-2 py-1"
              />
            </label>
            <button
              type="button"
              onClick={() => removeItem(item.productId)}
              className="text-xs tracking-[0.12em] text-white/60 hover:text-brand-orange"
            >
              REMOVE
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-end gap-4">
        <p className="text-lg text-white">
          Subtotal: <strong>{formatPrice(subtotalCents)}</strong>
        </p>
        <Link
          href="/checkout"
          className="bg-brand-orange px-8 py-4 text-sm font-bold tracking-[0.16em] text-white hover:bg-orange-500"
        >
          CHECKOUT
        </Link>
      </div>
    </div>
  );
}
