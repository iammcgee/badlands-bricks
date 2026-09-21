"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password !== confirm) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Reset failed");
      router.push("/login?reset=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-8 space-y-4">
        <p className="text-sm text-red-400">
          This reset link is missing or incomplete. Request a new one from the
          login page.
        </p>
        <p className="text-center text-sm text-white/60">
          <Link href="/forgot-password" className="text-brand-orange">
            Request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">
          NEW PASSWORD
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-xs tracking-[0.14em] text-white/70">
          CONFIRM PASSWORD
        </span>
        <input
          name="confirm"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-orange px-4 py-3 text-sm font-bold tracking-[0.14em] text-white disabled:opacity-60"
      >
        {loading ? "SAVING…" : "SAVE NEW PASSWORD"}
      </button>
      <p className="text-center text-sm text-white/60">
        <Link href="/login" className="text-brand-orange">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
