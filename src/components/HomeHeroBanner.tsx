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

export function HomeHeroBanner({ marquee }: { marquee: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const slides = Array.from(root.querySelectorAll<HTMLElement>("[data-hero-slide]"));
    if (slides.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = Number(visible.target.getAttribute("data-hero-slide"));
        if (Number.isFinite(index)) setActive(index);
      },
      { root, threshold: [0.55, 0.7] },
    );

    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (paused) return;

    const id = window.setInterval(() => {
      if (window.matchMedia("(min-width: 1024px)").matches) return;
      const root = scrollerRef.current;
      if (!root) return;
      const next = (active + 1) % CAROUSEL.length;
      const slide = root.querySelector<HTMLElement>(`[data-hero-slide="${next}"]`);
      slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }, 4200);

    return () => window.clearInterval(id);
  }, [active, paused]);

  function goTo(index: number) {
    const root = scrollerRef.current;
    if (!root) return;
    setPaused(true);
    const slide = root.querySelector<HTMLElement>(`[data-hero-slide="${index}"]`);
    slide?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  return (
    <section className="relative min-h-[78vh] overflow-hidden bg-black">
      {/* Phone + iPad: one full-bleed image at a time (snap carousel). */}
      <div className="lg:hidden">
        <div
          ref={scrollerRef}
          className="flex h-[78vh] snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none"
          onPointerDown={() => setPaused(true)}
          onTouchStart={() => setPaused(true)}
          aria-label="Featured builds"
        >
          {CAROUSEL.map((panel, index) => (
            <div
              key={panel.src}
              data-hero-slide={index}
              className="relative h-full w-full shrink-0 snap-center snap-always bg-black"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={panel.src}
                alt={panel.alt}
                className={`animate-hero-panel absolute inset-0 h-full w-full object-center ${
                  panel.fit === "contain" ? "object-contain" : "object-cover"
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
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
                active === index ? "bg-brand-orange scale-110" : "bg-white/45"
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
