"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function FavoriteButton({
  productId,
  initialFavorited,
  initialCount,
  compact = false,
}: {
  productId: string;
  initialFavorited: boolean;
  initialCount: number;
  compact?: boolean;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (response.status === 401) {
        const next = encodeURIComponent(window.location.pathname);
        router.push(`/login?next=${next}`);
        return;
      }

      const data = (await response.json()) as {
        favorited?: boolean;
        favoriteCount?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Failed");

      setFavorited(Boolean(data.favorited));
      setCount(data.favoriteCount ?? count);
      router.refresh();
    } catch {
      // keep previous UI state
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={
        compact
          ? "inline-flex items-center gap-1 text-white transition hover:text-brand-orange disabled:opacity-60"
          : "inline-flex w-full items-center justify-center gap-2 bg-black px-6 py-4 text-sm font-bold tracking-[0.16em] text-white ring-1 ring-white/40 transition hover:text-brand-orange hover:ring-brand-orange disabled:opacity-60"
      }
    >
      <HeartIcon filled={favorited} />
      <span>{count}</span>
      {!compact && <span>{favorited ? "LIKED" : "LIKE"}</span>}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      aria-hidden
    >
      <path
        d="M12 21s-6.7-4.2-9.2-8.2C1.1 10.1 1.8 6.8 4.6 5.3 6.6 4.2 9 4.8 10.4 6.5L12 8.3l1.6-1.8c1.4-1.7 3.8-2.3 5.8-1.2 2.8 1.5 3.5 4.8 1.8 7.5C18.7 16.8 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
