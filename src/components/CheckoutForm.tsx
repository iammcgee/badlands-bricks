"use client";

import { FormEvent, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";

export function CheckoutForm() {
  const { items, subtotalCents, clearCart } = useCart();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = (await response.json()) as {
        url?: string;
        error?: string;
        free?: boolean;
        orderId?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      if (data.free && data.orderId) {
        clearCart();
        window.location.href = `/checkout/success?orderId=${data.orderId}`;
        return;
      }

      if (data.url) {
        clearCart();
        window.location.href = data.url;
        return;
      }

      throw new Error("No checkout URL returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <p className="text-white/70">
        Your cart is empty.{" "}
        <a href="/build" className="text-brand-orange underline">
          Browse builds
        </a>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-3 border border-white/15 p-4">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center justify-between gap-4 text-sm text-white"
          >
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.priceCents * item.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-white/15 pt-3 font-bold text-white">
          <span>Total</span>
          <span>{formatPrice(subtotalCents)}</span>
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">EMAIL</span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
          placeholder="you@email.com"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-orange px-6 py-4 text-sm font-bold tracking-[0.16em] text-white transition hover:bg-orange-500 disabled:opacity-60"
      >
        {loading
          ? "PROCESSING..."
          : subtotalCents === 0
            ? "GET FREE DOWNLOADS"
            : "PAY WITH STRIPE"}
      </button>

      {subtotalCents > 0 && (
        <p className="text-xs text-white/50">
          Paid checkouts require Stripe keys in `.env`. Free items work without
          Stripe.
        </p>
      )}
    </form>
  );
}
