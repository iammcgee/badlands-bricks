import { Suspense } from "react";
import { SignupForm } from "@/components/SignupForm";

export const metadata = { title: "Sign Up" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white">
        SIGN UP
      </h1>
      <p className="mt-3 text-white/70">
        Create a free account to save favorites, follow creators, and submit
        MOCs. Want to sell your builds or unlock members-only MOCs? Join the{" "}
        <a href="/plan" className="text-brand-orange hover:underline">
          Badlands Plan
        </a>{" "}
        — the first 30 memberships get the first month free.
      </p>
      <Suspense fallback={<p className="mt-8 text-white/50">Loading…</p>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
