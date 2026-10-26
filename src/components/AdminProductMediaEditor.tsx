"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageOrganizer } from "@/components/ImageOrganizer";
import {
  formatBytes,
  isOverUploadLimit,
  MOC_UPLOAD_LIMIT_BYTES,
} from "@/lib/file-size";
import type { MocMediaItem } from "@/lib/moc-builder";
import { revokeMediaItems } from "@/lib/moc-builder";
import { uploadMocProductMedia } from "@/lib/moc-blob-client";

export function AdminProductMediaEditor({
  productId,
  productName,
  currentImages,
  currentPdfUrl,
}: {
  productId: string;
  productName: string;
  currentImages: string[];
  currentPdfUrl: string | null;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<MocMediaItem[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      revokeMediaItems(photos);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const oversize =
    photos.some((item) => isOverUploadLimit(item.file.size)) ||
    (pdfFile ? isOverUploadLimit(pdfFile.size) : false);

  const canSave = useMemo(
    () =>
      (photos.length > 0 || Boolean(pdfFile)) &&
      !oversize &&
      status !== "loading",
    [photos.length, pdfFile, oversize, status],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setStatus("loading");
    setMessage("Uploading updated MOC media…");

    try {
      const assets = await uploadMocProductMedia({
        photos: photos.length > 0 ? photos : undefined,
        pdfFile,
        mocName: productName,
        onProgress: (label) => setMessage(label),
      });

      const response = await fetch(`/api/admin/products/${productId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrls: assets.photoUrls.length > 0 ? assets.photoUrls : undefined,
          pdfUrl: assets.pdfUrl,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not update media");

      setStatus("done");
      setMessage("MOC media updated.");
      revokeMediaItems(photos);
      setPhotos([]);
      setPdfFile(null);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Update failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 border border-white/15 p-5">
      <div>
        <h2 className="font-display text-2xl text-white">Update photos & PDF</h2>
        <p className="mt-2 text-sm text-white/60">
          Replace the Build gallery photos and/or the downloadable instructions
          PDF. Leave a section empty to keep what&apos;s already live.
        </p>
      </div>

      {currentImages.length > 0 ? (
        <div>
          <p className="mb-2 text-sm text-white/50">Current gallery</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {currentImages.slice(0, 8).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={src}
                src={src}
                alt=""
                className="aspect-[4/3] w-full bg-neutral-900 object-cover"
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/45">No gallery photos on this MOC yet.</p>
      )}

      <ImageOrganizer
        title="New showcase photos"
        hint="Optional — if you add photos here, they replace the current gallery."
        items={photos}
        onChange={setPhotos}
        emptyLabel="No replacement photos selected"
      />

      <div className="space-y-2">
        <p className="text-sm text-white/70">Instructions PDF</p>
        {currentPdfUrl ? (
          <p className="text-xs text-white/45">
            Current PDF:{" "}
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-orange hover:underline"
            >
              open current file
            </a>
          </p>
        ) : (
          <p className="text-xs text-white/45">No downloadable PDF yet.</p>
        )}
        <input
          type="file"
          accept="application/pdf"
          onChange={(event) => setPdfFile(event.target.files?.[0] || null)}
          className="block w-full text-sm text-white/70 file:mr-3 file:border file:border-brand-orange file:bg-transparent file:px-3 file:py-2 file:text-xs file:font-bold file:tracking-[0.12em] file:text-brand-orange"
        />
        {pdfFile ? (
          <p className="text-xs text-white/50">
            Ready to upload: {pdfFile.name} ({formatBytes(pdfFile.size)})
          </p>
        ) : null}
        <p className="text-xs text-white/40">
          Per-file limit: {formatBytes(MOC_UPLOAD_LIMIT_BYTES)}
        </p>
      </div>

      {oversize ? (
        <p className="text-sm text-red-400">
          One or more files are over the upload limit.
        </p>
      ) : null}
      {message ? (
        <p
          className={`text-sm ${
            status === "error"
              ? "text-red-400"
              : status === "done"
                ? "text-brand-orange"
                : "text-white/70"
          }`}
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSave}
        className="bg-brand-orange px-5 py-3 text-sm font-bold tracking-[0.14em] text-white disabled:opacity-50"
      >
        {status === "loading" ? "UPDATING…" : "UPDATE MOC MEDIA"}
      </button>
    </form>
  );
}
