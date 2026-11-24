"use client";

import { useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import type { ProductView } from "@/lib/products";

const PREVIEW_COUNT = 3;

export function HomeMocsSection({
  featured,
  rest,
  hasPlanAccess,
}: {
  featured: ProductView[];
  rest: ProductView[];
  hasPlanAccess: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const wasExpanded = useRef(false);
  const preview = rest.slice(0, PREVIEW_COUNT);
  const extras = showAll ? rest : [];

  useEffect(() => {
    if (wasExpanded.current && !showAll) {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    wasExpanded.current = showAll;
  }, [showAll]);

  return (
    <section
      ref={sectionRef}
      id="home-mocs"
      className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 md:px-8"
    >
      <h2 className="text-center font-display text-5xl tracking-[0.1em] text-white md:text-6xl">
        MOCS
      </h2>

      <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            hasPlanAccess={hasPlanAccess}
          />
        ))}
        {showAll
          ? extras.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                hasPlanAccess={hasPlanAccess}
              />
            ))
          : null}
      </div>

      {!showAll && preview.length > 0 ? (
        <div className="relative mt-8 max-h-44 overflow-hidden md:max-h-52">
          <div
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
            aria-hidden="true"
            inert
          >
            {preview.map((product) => (
              <div
                key={product.id}
                className="pointer-events-none select-none opacity-55"
              >
                <ProductCard
                  product={product}
                  hasPlanAccess={hasPlanAccess}
                />
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-black/70 to-black" />
        </div>
      ) : null}

      {rest.length > 0 ? (
        <div className="relative z-10 mt-2 text-center md:mt-4">
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => setShowAll((open) => !open)}
            className="inline-block border border-white px-8 py-3 text-sm font-bold tracking-[0.16em] text-white transition hover:border-brand-orange hover:text-brand-orange"
          >
            {showAll ? "SHOW LESS" : "SHOP ALL MOCS"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
