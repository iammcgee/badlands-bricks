"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function SignupForm() {
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
    const payload = {
      name: String(form.get("name") || ""),
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    };

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        earlyCreator?: boolean;
        earlyCreatorNumber?: number | null;
      };
      if (!response.ok) throw new Error(data.error || "Signup failed");

      const result = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
      });
      if (result?.error) throw new Error("Account created, but login failed");

      if (data.earlyCreator && data.earlyCreatorNumber) {
        router.push(
          `/submit-your-mocs?founding=${data.earlyCreatorNumber}`,
        );
      } else {
        router.push(next);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">NAME</span>
        <input
          name="name"
          required
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>
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
        {loading ? "CREATING…" : "CREATE ACCOUNT"}
      </button>
      <p className="text-center text-sm text-white/60">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-brand-orange">
          Sign in
        </Link>
      </p>
    </form>
  );
}
