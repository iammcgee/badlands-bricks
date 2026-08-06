"use client";

import { useState } from "react";

export function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const slides = images.length > 0 ? images : ["/products/placeholder.svg"];
  const [index, setIndex] = useState(0);

  return (
    <div className="relative bg-neutral-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slides[index]}
        alt={`${name} photo ${index + 1}`}
        className="aspect-square w-full object-cover md:aspect-[4/3]"
      />
      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() =>
              setIndex((current) =>
                current === 0 ? slides.length - 1 : current - 1,
              )
            }
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 px-3 py-2 text-white"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() =>
              setIndex((current) =>
                current === slides.length - 1 ? 0 : current + 1,
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 px-3 py-2 text-white"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
