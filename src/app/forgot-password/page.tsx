import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white">
        FORGOT PASSWORD
      </h1>
      <p className="mt-3 text-white/70">
        Enter your account email and we&apos;ll send a link to choose a new
        password.
      </p>
      <Suspense fallback={<p className="mt-8 text-white/50">Loading…</p>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
