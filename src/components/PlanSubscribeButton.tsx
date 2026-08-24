"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  signedIn: boolean;
  hasActivePlan: boolean;
  cancelAtPeriodEnd?: boolean;
  priceLabel: string;
};

export function PlanSubscribeButton({
  signedIn,
  hasActivePlan,
  cancelAtPeriodEnd,
  priceLabel,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/plan/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Could not start checkout");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start checkout");
      setBusy(false);
    }
  }

  async function openPortal() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/plan/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Could not open billing portal");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not open billing portal");
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="space-y-3">
        <Link
          href="/login?next=%2Fplan"
          className="inline-flex bg-brand-orange px-6 py-4 text-sm font-bold tracking-[0.16em] text-white transition hover:bg-orange-500"
        >
          SIGN IN TO SUBSCRIBE · {priceLabel}
        </Link>
        <p className="text-xs text-white/45">
          Need an account?{" "}
          <Link href="/signup?next=%2Fplan" className="text-brand-orange hover:underline">
            Create one
          </Link>
        </p>
      </div>
    );
  }

  if (hasActivePlan) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-brand-orange">
          {cancelAtPeriodEnd
            ? "Your plan stays active until the end of the billing period."
            : "You’re on the Badlands Plan."}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => void openPortal()}
          className="inline-flex border border-white/25 px-6 py-4 text-sm font-bold tracking-[0.16em] text-white transition hover:border-brand-orange hover:text-brand-orange disabled:opacity-60"
        >
          {busy ? "OPENING…" : "MANAGE BILLING"}
        </button>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="button"
          className="block text-xs text-white/45 hover:text-brand-orange"
          onClick={() => router.refresh()}
        >
          Refresh status
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void startCheckout()}
        className="inline-flex bg-brand-orange px-6 py-4 text-sm font-bold tracking-[0.16em] text-white transition hover:bg-orange-500 disabled:opacity-60"
      >
        {busy ? "STARTING…" : `SUBSCRIBE · ${priceLabel}`}
      </button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
