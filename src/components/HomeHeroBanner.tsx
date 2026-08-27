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

/** Mobile/tablet order: lead with Max Flex, then the flanks. */
const CAROUSEL = [TRIPTYCH[1], TRIPTYCH[0], TRIPTYCH[2]];
const N = CAROUSEL.length;
const AUTO_MS = 3500;
const RESUME_MS = 6000;

export function HomeHeroBanner({ marquee }: { marquee: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimerRef = useRef(0);
  const touchStartX = useRef<number | null>(null);

  function pauseTemporarily() {
    setPaused(true);
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      setPaused(false);
    }, RESUME_MS);
  }

  function goTo(index: number) {
    setActive(((index % N) + N) % N);
    pauseTemporarily();
  }

  // Timer-based autoplay on phone / iPad only.
  useEffect(() => {
    if (paused) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      setActive((current) => (current + 1) % N);
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [paused]);

  useEffect(() => {
    return () => window.clearTimeout(resumeTimerRef.current);
  }, []);

  return (
    <section className="relative min-h-[78vh] overflow-hidden bg-black">
      {/* Phone + iPad: automatic looping carousel (timer-based). */}
      <div
        className="relative h-[78vh] lg:hidden"
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0]?.clientX ?? null;
          pauseTemporarily();
        }}
        onTouchEnd={(event) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = event.changedTouches[0]?.clientX;
          if (end == null) return;
          const delta = end - start;
          if (Math.abs(delta) < 40) return;
          if (delta < 0) goTo(active + 1);
          else goTo(active - 1);
        }}
        aria-label="Featured builds"
        aria-roledescription="carousel"
      >
        {CAROUSEL.map((panel, index) => (
          <div
            key={panel.src}
            className={`absolute inset-0 bg-black transition-opacity duration-700 ease-out ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={index !== active}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={panel.src}
              alt={panel.alt}
              className={`h-full w-full object-center ${
                panel.fit === "contain" ? "object-contain" : "object-cover"
              }`}
              draggable={false}
            />
          </div>
        ))}

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
