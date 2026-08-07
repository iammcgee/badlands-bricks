"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AccountMenu() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <span className="text-xs tracking-[0.12em] text-white/50">…</span>;
  }

  if (!data?.user) {
    return (
      <Link
        href="/login"
        className="text-xs tracking-[0.14em] text-white transition hover:text-brand-orange"
      >
        LOGIN
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-xs tracking-[0.12em]">
      <Link href="/favorites" className="text-white hover:text-brand-orange">
        FAVORITES
      </Link>
      <Link
        href="/following"
        className="hidden text-white hover:text-brand-orange sm:inline"
      >
        FOLLOWING
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-white/70 hover:text-brand-orange"
      >
        SIGN OUT
      </button>
    </div>
  );
}
