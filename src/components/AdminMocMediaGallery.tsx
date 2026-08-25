"use client";

import { useCallback, useEffect, useState } from "react";

export type AdminGalleryItem = {
  src: string;
  label: string;
};

type Props = {
  title: string;
  items: AdminGalleryItem[];
  emptyLabel?: string;
};

export function AdminMocMediaGallery({
  title,
  items,
  emptyLabel = "None stored",
}: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current == null || items.length === 0) return current;
      return (current - 1 + items.length) % items.length;
    });
  }, [items.length]);
  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current == null || items.length === 0) return current;
      return (current + 1) % items.length;
    });
  }, [items.length]);

  useEffect(() => {
    if (activeIndex == null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") showPrev();
      if (event.key === "ArrowRight") showNext();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, close, showPrev, showNext]);

  if (items.length === 0) {
    return (
      <div>
        <p className="mb-2 text-white/50">{title}</p>
        <p className="text-xs text-white/50">{emptyLabel}</p>
      </div>
    );
  }

  const active = activeIndex != null ? items[activeIndex] : null;

  return (
    <div>
      <p className="mb-2 text-white/50">
        {title}{" "}
        <span className="text-white/35">
          · click any image to browse all {items.length}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item, index) => (
          <button
            key={`${item.src}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="group relative aspect-[4/3] overflow-hidden border border-white/15 bg-neutral-900 text-left transition hover:border-brand-orange"
            aria-label={`Open ${item.label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.label}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <span className="absolute bottom-1 left-1 bg-black/70 px-1.5 py-0.5 text-[10px] tracking-[0.08em] text-white/80">
              {index + 1}/{items.length}
            </span>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} gallery`}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 border border-white/20 bg-black/70 px-3 py-2 text-xs tracking-[0.14em] text-white hover:border-brand-orange hover:text-brand-orange"
          >
            CLOSE
          </button>

          {items.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showPrev();
                }}
                className="absolute left-3 top-1/2 z-10 -translate-y-1/2 border border-white/20 bg-black/70 px-3 py-4 text-white hover:border-brand-orange hover:text-brand-orange md:left-6"
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  showNext();
                }}
                className="absolute right-3 top-1/2 z-10 -translate-y-1/2 border border-white/20 bg-black/70 px-3 py-4 text-white hover:border-brand-orange hover:text-brand-orange md:right-6"
                aria-label="Next image"
              >
                ›
              </button>
            </>
          ) : null}

          <div
            className="flex max-h-full w-full max-w-5xl flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.src}
              alt={active.label}
              className="max-h-[78vh] w-auto max-w-full object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-white/70">
              <span>
                {(activeIndex ?? 0) + 1} / {items.length}
              </span>
              <span className="max-w-md truncate">{active.label}</span>
              <a
                href={active.src}
                target="_blank"
                rel="noreferrer"
                className="text-brand-orange hover:underline"
              >
                Open original
              </a>
            </div>
            {items.length > 1 ? (
              <p className="text-[10px] tracking-[0.12em] text-white/40">
                Use ← → keys or buttons to scroll through images
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
