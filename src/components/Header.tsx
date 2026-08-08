"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { useCart } from "@/components/CartProvider";
import { LOGO_SRC, YOUTUBE_URL } from "@/lib/site";

const nav = [
  { href: "/build", label: "BUILD" },
  { href: "/submit-your-mocs", label: "SUBMIT YOUR MOCS" },
  { href: "/contact-us", label: "CONTACT" },
];

export function Header() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="Badlands Bricks"
            className="h-10 w-10 object-contain md:h-12 md:w-12"
          />
          <span className="font-display text-lg tracking-[0.08em] md:text-xl">
            BADLANDS BRICKS
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs tracking-[0.14em] text-white transition hover:text-brand-orange ${
                  active ? "underline underline-offset-8" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 md:gap-4">
          <AccountMenu />
          <a
            href={YOUTUBE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="YouTube"
            className="hidden text-white transition hover:text-brand-orange sm:inline"
          >
            <YoutubeIcon />
          </a>
          <Link
            href="/cart"
            className="flex items-center gap-1 text-white transition hover:text-brand-orange"
            aria-label={`${itemCount} items in cart`}
          >
            <CartIcon />
            <span className="text-sm">{itemCount}</span>
          </Link>
          <Link
            href="/build"
            className="bg-brand-orange px-3 py-2 text-xs font-bold tracking-[0.14em] text-white transition hover:bg-orange-500 md:px-4"
          >
            SEARCH
          </Link>
        </div>
      </div>

      <nav className="flex items-center justify-center gap-4 border-t border-white/10 px-4 py-2 lg:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-[10px] tracking-[0.12em] text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}

function YoutubeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7L16 12l-6.2 3.5z" />
    </svg>
  );
}
