"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/file-size";
import type { MocMediaItem } from "@/lib/moc-builder";
import {
  isImageFile,
  moveMediaItem,
  normalizeMocImageFile,
} from "@/lib/moc-builder";

export function ImageOrganizer({
  title,
  hint,
  items,
  onChange,
  emptyLabel,
}: {
  title: string;
  hint: string;
  items: MocMediaItem[];
  onChange: (items: MocMediaItem[]) => void;
  emptyLabel: string;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFilesSelected(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    setError("");
    try {
      const incoming: MocMediaItem[] = [];
      for (const file of Array.from(fileList)) {
        if (!isImageFile(file)) continue;
        const normalized = await normalizeMocImageFile(file);
        incoming.push({
          id: `${normalized.name}-${normalized.size}-${crypto.randomUUID()}`,
          file: normalized,
          previewUrl: URL.createObjectURL(normalized),
        });
      }
      if (incoming.length === 0) {
        setError("No usable photos found. Try JPEG/PNG, or HEIC from iPhone/iPad.");
        return;
      }
      onChange([...items, ...incoming]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add photos");
    } finally {
      setBusy(false);
    }
  }

  function removeAt(index: number) {
    const next = [...items];
    const [removed] = next.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onChange(next);
  }

  return (
    <section className="space-y-4 border border-white/15 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl tracking-[0.06em] text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-white/60">{hint}</p>
        </div>
        <label
          className={`inline-block cursor-pointer border border-brand-orange px-4 py-2 text-xs font-bold tracking-[0.14em] text-brand-orange transition hover:bg-brand-orange hover:text-white ${
            busy ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {busy ? "CONVERTING…" : "ADD PHOTOS"}
          <input
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            disabled={busy}
            className="hidden"
            onChange={(event) => {
              void onFilesSelected(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {items.length > 0 ? (
        <p className="text-xs text-white/50">
          {items.length} file{items.length === 1 ? "" : "s"} ·{" "}
          {formatBytes(items.reduce((sum, item) => sum + item.file.size, 0))}{" "}
          total
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="border border-dashed border-white/25 px-4 py-10 text-center text-sm text-white/50">
          {emptyLabel}
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (dragIndex === null) return;
                onChange(moveMediaItem(items, dragIndex, index));
                setDragIndex(null);
              }}
              className={`border bg-neutral-950 p-2 transition ${
                dragIndex === index
                  ? "border-brand-orange"
                  : "border-white/15 hover:border-white/40"
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={`Item ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-2 top-2 bg-black/80 px-2 py-1 text-xs font-bold tracking-[0.12em] text-brand-orange">
                  {index + 1}
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-white/50">{item.file.name}</p>
              <p className="text-xs text-white/40">{formatBytes(item.file.size)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onChange(moveMediaItem(items, index, index - 1))}
                  className="border border-white/20 px-2 py-1 text-[10px] tracking-[0.1em] text-white/80 disabled:opacity-30"
                >
                  UP
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => onChange(moveMediaItem(items, index, index + 1))}
                  className="border border-white/20 px-2 py-1 text-[10px] tracking-[0.1em] text-white/80 disabled:opacity-30"
                >
                  DOWN
                </button>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="border border-red-400/40 px-2 py-1 text-[10px] tracking-[0.1em] text-red-300"
                >
                  REMOVE
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
