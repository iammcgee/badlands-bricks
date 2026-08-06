import { CheckoutForm } from "@/components/CheckoutForm";

export const metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-8">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
        CHECKOUT
      </h1>
      <p className="mt-3 text-white/70">
        Enter your email to receive download links for your digital building
        guides.
      </p>
      <div className="mt-8">
        <CheckoutForm />
      </div>
    </div>
  );
}
