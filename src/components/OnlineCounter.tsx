"use client";

import { useEffect, useState } from "react";

export function OnlineCounter({
  size = "sm",
}: {
  size?: "sm" | "lg";
}) {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function beat() {
      try {
        const response = await fetch("/api/presence", { method: "POST" });
        const data = (await response.json()) as { onlineCount?: number };
        if (!cancelled && typeof data.onlineCount === "number") {
          setOnlineCount(data.onlineCount);
        }
      } catch {
        // ignore transient network errors
      }
    }

    beat();
    const id = window.setInterval(beat, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const large = size === "lg";
  const textClass = large
    ? "text-sm tracking-[0.16em] text-white/80 md:text-base"
    : "text-xs tracking-[0.12em] text-white/70";
  const dotClass = large
    ? "mr-2 inline-block h-2.5 w-2.5 rounded-full bg-green-400"
    : "mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-400";

  if (onlineCount === null) {
    return (
      <span className={large ? "text-sm tracking-[0.16em] text-white/50 md:text-base" : "text-xs tracking-[0.12em] text-white/50"}>
        ONLINE…
      </span>
    );
  }

  return (
    <span className={textClass}>
      <span className={dotClass} />
      {onlineCount} ONLINE
    </span>
  );
}
