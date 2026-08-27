"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const TRIPTYCH = [
  {
    src: "/products/bee-buggy-1.jpg",
    alt: "Bee Buggy",
    fit: "cover" as const,
  },
  {
    src: "/products/hero.webp",
    alt: "Max Flex MOC by Wesley",
    fit: "contain" as const,
  },
  {
    src: "/products/trophy-truck-1.jpg",
    alt: "Trophy Truck",
    fit: "cover" as const,
  },
];

/** Mobile/tablet carousel order: lead with Max Flex, then the flanks. */
const CAROUSEL = [TRIPTYCH[1], TRIPTYCH[0], TRIPTYCH[2]];
const N = CAROUSEL.length;
/** Triple the track so swipe can loop forever: …123 123 123… */
const LOOP = [...CAROUSEL, ...CAROUSEL, ...CAROUSEL];
const START_INDEX = N; // middle copy

export function HomeHeroBanner({ marquee }: { marquee: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const absoluteIndexRef = useRef(START_INDEX);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  function slideWidth() {
    return scrollerRef.current?.clientWidth || 0;
  }

  function scrollToAbsolute(index: number, behavior: ScrollBehavior) {
    const root = scrollerRef.current;
    const width = slideWidth();
    if (!root || !width) return;
    root.scrollTo({ left: index * width, behavior });
    absoluteIndexRef.current = index;
    setActive(((index % N) + N) % N);
  }

  /** If we landed in the first/last copy, jump to the matching middle slide. */
  function normalizeLoop() {
    const root = scrollerRef.current;
    const width = slideWidth();
    if (!root || !width) return;

    const index = Math.round(root.scrollLeft / width);
    absoluteIndexRef.current = index;
    setActive(((index % N) + N) % N);

    if (index < N) {
      scrollToAbsolute(index + N, "auto");
    } else if (index >= N * 2) {
      scrollToAbsolute(index - N, "auto");
    }
  }

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    // Land on the middle Max Flex slide without a visible jump.
    const boot = () => scrollToAbsolute(START_INDEX, "auto");
    boot();
    const bootFrame = window.requestAnimationFrame(boot);

    const onScrollEnd = () => normalizeLoop();
    root.addEventListener("scrollend", onScrollEnd);

    // Fallback for browsers without scrollend.
    let settleTimer = 0;
    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => normalizeLoop(), 80);
    };
    root.addEventListener("scroll", onScroll, { passive: true });

    const onResize = () => scrollToAbsolute(absoluteIndexRef.current, "auto");
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(bootFrame);
      root.removeEventListener("scrollend", onScrollEnd);
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(settleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only setup
  }, []);

  useEffect(() => {
    if (paused) return;

    const id = window.setInterval(() => {
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      const next = absoluteIndexRef.current + 1;
      scrollToAbsolute(next, "smooth");
      // normalizeLoop runs on scrollend / settle.
    }, 4200);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  function goTo(logical: number) {
    setPaused(true);
    // Prefer the middle copy so we keep infinite headroom either direction.
    scrollToAbsolute(N + logical, "smooth");
  }

  return (
    <section className="relative min-h-[78vh] overflow-hidden bg-black">
      {/* Phone + iPad: infinite looping full-bleed carousel. */}
      <div className="lg:hidden">
        <div
          ref={scrollerRef}
          className="flex h-[78vh] snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
          onPointerDown={() => setPaused(true)}
          onTouchStart={() => setPaused(true)}
          aria-label="Featured builds"
        >
          {LOOP.map((panel, index) => (
            <div
              key={`${panel.src}-${index}`}
              data-hero-slide={index}
              className="relative h-full w-full shrink-0 snap-center snap-always bg-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={panel.src}
                alt={panel.alt}
                className={`absolute inset-0 h-full w-full object-center ${
                  panel.fit === "contain" ? "object-contain" : "object-cover"
                }`}
                draggable={false}
              />
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-20 z-10 flex justify-center gap-2.5">
          {CAROUSEL.map((panel, index) => (
            <button
              key={panel.src}
              type="button"
              aria-label={`Show ${panel.alt}`}
              aria-current={active === index}
              onClick={() => goTo(index)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                active === index ? "scale-110 bg-brand-orange" : "bg-white/45"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop / large tablet landscape: Bee Buggy | Max Flex | Trophy Truck */}
      <div className="absolute inset-0 hidden grid-cols-3 lg:grid">
        {TRIPTYCH.map((panel, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={panel.src}
            src={panel.src}
            alt={panel.alt}
            className={`animate-hero-panel h-full w-full bg-black object-center ${
              panel.fit === "contain" ? "object-contain" : "object-cover"
            }`}
            style={{ animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black" />

      <div className="pointer-events-none absolute inset-0 flex min-h-[78vh] flex-col items-center justify-center px-4 text-center">
        <Link
          href="/build"
          className="pointer-events-auto animate-hero-cta bg-brand-orange/90 px-8 py-4 font-display text-3xl tracking-[0.08em] text-white shadow-lg transition hover:bg-brand-orange sm:px-10 sm:py-5 sm:text-4xl md:text-5xl lg:text-6xl"
        >
          BUILD NOW
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 z-20 w-full overflow-hidden border-y border-white/10 bg-black/40 py-2.5 sm:py-3">
        <div className="animate-marquee flex w-max whitespace-nowrap font-display text-2xl tracking-[0.06em] text-white sm:text-3xl md:text-4xl lg:text-5xl">
          <span>{marquee.repeat(4)}</span>
          <span>{marquee.repeat(4)}</span>
        </div>
      </div>
    </section>
  );
}
