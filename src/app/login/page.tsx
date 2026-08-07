import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white">LOGIN</h1>
      <p className="mt-3 text-white/70">
        Sign in to like MOCs and follow your favorite creators.
      </p>
      <Suspense fallback={<p className="mt-8 text-white/50">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
