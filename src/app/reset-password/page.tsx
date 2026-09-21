import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white">
        RESET PASSWORD
      </h1>
      <p className="mt-3 text-white/70">
        Choose a new password for your Badlands Bricks account.
      </p>
      <Suspense fallback={<p className="mt-8 text-white/50">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
