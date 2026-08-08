import { SubmitMocForm } from "@/components/SubmitMocForm";

export const metadata = { title: "SUBMIT YOUR MOCS" };

export default function SubmitMocsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <div className="max-w-3xl">
        <p className="text-xs tracking-[0.16em] text-brand-orange">
          MOC BUILDER
        </p>
        <h1 className="mt-3 font-display text-5xl tracking-[0.08em] text-white md:text-6xl">
          SUBMIT YOUR MOC
        </h1>
        <p className="mt-4 text-white/70">
          Upload your photos, drag them into the right order, and we&apos;ll
          turn your instruction steps into a clean PDF — right here, no Adobe
          needed.
        </p>
      </div>
      <div className="mt-10">
        <SubmitMocForm />
      </div>
    </div>
  );
}
