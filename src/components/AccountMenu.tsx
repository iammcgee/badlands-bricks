"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";

function isStaffRole(role?: string | null) {
  return role === "admin" || role === "reviewer";
}

export function AccountMenu() {
  const { data, status } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

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

  const staff = isStaffRole(data.user.role);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="rounded-full ring-1 ring-white/25 transition hover:ring-brand-orange"
      >
        <UserAvatar name={data.user.name} image={data.user.image} size={34} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-56 border border-white/15 bg-black py-2 shadow-xl"
        >
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">
              {data.user.name || "Builder"}
            </p>
            <p className="truncate text-xs text-white/50">{data.user.email}</p>
          </div>
          {staff ? (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>
              Admin portal
            </MenuLink>
          ) : null}
          <MenuLink href="/plan" onClick={() => setOpen(false)}>
            Badlands Plan
          </MenuLink>
          <MenuLink href="/my-mocs" onClick={() => setOpen(false)}>
            My MOCs
          </MenuLink>
          <MenuLink href="/settings" onClick={() => setOpen(false)}>
            Edit profile
          </MenuLink>
          <MenuLink href="/favorites" onClick={() => setOpen(false)}>
            Favorites
          </MenuLink>
          <MenuLink href="/following" onClick={() => setOpen(false)}>
            Following
          </MenuLink>
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full px-4 py-2.5 text-left text-xs tracking-[0.12em] text-white/70 transition hover:bg-white/5 hover:text-brand-orange"
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block px-4 py-2.5 text-xs tracking-[0.12em] text-white transition hover:bg-white/5 hover:text-brand-orange"
    >
      {children}
    </Link>
  );
}
