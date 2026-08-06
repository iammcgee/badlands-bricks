import { SubmitMocForm } from "@/components/SubmitMocForm";

export const metadata = { title: "SUBMIT YOUR MOCS" };

export default function SubmitMocsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <div className="overflow-hidden bg-neutral-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/products/trophy-truck-1.svg"
            alt="Custom LEGO trophy truck"
            className="aspect-square w-full object-cover"
          />
        </div>
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white md:text-6xl">
            SUBMIT YOUR MOC&apos;S
          </h1>
          <p className="mt-4 text-white/70">
            Share your custom design with the Badlands Bricks community. Upload
            photos of your build and instruction pages for review.
          </p>
          <div className="mt-8">
            <SubmitMocForm />
          </div>
        </div>
      </div>
    </div>
  );
}
