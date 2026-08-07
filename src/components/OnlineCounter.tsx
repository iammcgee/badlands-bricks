"use client";

import { useEffect, useState } from "react";

export function OnlineCounter() {
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

  if (onlineCount === null) {
    return <span className="text-xs tracking-[0.12em] text-white/50">ONLINE…</span>;
  }

  return (
    <span className="text-xs tracking-[0.12em] text-white/70">
      <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
      {onlineCount} ONLINE
    </span>
  );
}
