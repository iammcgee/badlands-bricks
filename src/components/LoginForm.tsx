"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);

    const result = await signIn("credentials", {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">EMAIL</span>
        <input
          name="email"
          type="email"
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">PASSWORD</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-orange px-4 py-3 text-sm font-bold tracking-[0.14em] text-white disabled:opacity-60"
      >
        {loading ? "SIGNING IN…" : "SIGN IN"}
      </button>
      <p className="text-center text-sm text-white/60">
        New here?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-brand-orange">
          Create an account
        </Link>
      </p>
    </form>
  );
}
