import { Suspense } from "react";
import { SignupForm } from "@/components/SignupForm";
import {
  getEarlyCreatorLimit,
  getEarlyCreatorSlotsRemaining,
} from "@/lib/early-creators";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign Up" };

export default async function SignupPage() {
  const remaining = await getEarlyCreatorSlotsRemaining();
  const limit = getEarlyCreatorLimit();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white">
        SIGN UP
      </h1>
      <p className="mt-3 text-white/70">
        Create a free account to save favorites, follow creators, and submit
        MOCs.
      </p>
      {remaining > 0 ? (
        <p className="mt-4 border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          Founding Creator spots left: {remaining} of {limit}. The first {limit}{" "}
          accounts can list MOCs for sale without a paid membership.
        </p>
      ) : (
        <p className="mt-4 border border-white/15 px-4 py-3 text-sm text-white/60">
          The Founding Creator cohort ({limit}) is full. You can still submit
          MOCs for free — selling unlocks with Badlands Plan membership.
        </p>
      )}
      <Suspense fallback={<p className="mt-8 text-white/50">Loading…</p>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
