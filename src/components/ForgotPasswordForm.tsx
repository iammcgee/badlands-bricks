"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(form.get("email") || "") }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Request failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 space-y-4">
        <p className="text-sm text-white/80">
          If an account exists for that email, we sent a password reset link.
          Check your inbox (and spam folder). The link expires in one hour.
        </p>
        <p className="text-center text-sm text-white/60">
          <Link href="/login" className="text-brand-orange">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">EMAIL</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-orange px-4 py-3 text-sm font-bold tracking-[0.14em] text-white disabled:opacity-60"
      >
        {loading ? "SENDING…" : "SEND RESET LINK"}
      </button>
      <p className="text-center text-sm text-white/60">
        Remember it?{" "}
        <Link href="/login" className="text-brand-orange">
          Sign in
        </Link>
      </p>
    </form>
  );
}
