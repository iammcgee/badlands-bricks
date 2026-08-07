"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FollowButton({
  creatorId,
  initialFollowing,
  initialCount,
}: {
  creatorId: string;
  initialFollowing: boolean;
  initialCount: number;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      });

      if (response.status === 401) {
        const next = encodeURIComponent(window.location.pathname);
        router.push(`/login?next=${next}`);
        return;
      }

      const data = (await response.json()) as {
        following?: boolean;
        followerCount?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Failed");

      setFollowing(Boolean(data.following));
      setCount(data.followerCount ?? count);
      router.refresh();
    } catch {
      // keep previous UI
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="bg-brand-orange px-6 py-3 text-sm font-bold tracking-[0.14em] text-white transition hover:bg-orange-500 disabled:opacity-60"
      >
        {following ? "FOLLOWING" : "FOLLOW"}
      </button>
      <p className="text-sm text-white/60">{count} followers</p>
    </div>
  );
}
