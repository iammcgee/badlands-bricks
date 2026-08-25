"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ImageOrganizer } from "@/components/ImageOrganizer";
import {
  formatBytes,
  isOverUploadLimit,
  MOC_UPLOAD_LIMIT_BYTES,
} from "@/lib/file-size";
import { uploadMocAssets } from "@/lib/moc-blob-client";
import {
  buildInstructionsPdf,
  MocMediaItem,
  revokeMediaItems,
} from "@/lib/moc-builder";

type SubmitMocFormProps = {
  mode?: "user" | "admin";
  /** When true, files go to Vercel Blob (required for reliable production submits). */
  useBlobUploads?: boolean;
  /** Active Badlands Plan members can request a sale price. */
  canSell?: boolean;
  planPriceLabel?: string;
};

export function SubmitMocForm({
  mode = "user",
  useBlobUploads = false,
  canSell = false,
  planPriceLabel = "$9.99/mo",
}: SubmitMocFormProps) {
  const { data: session, status: sessionStatus } = useSession();
  const isAdmin = mode === "admin";
  const [mocName, setMocName] = useState("");
  const [theme, setTheme] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [wantToSell, setWantToSell] = useState(false);
  const [adminStatus, setAdminStatus] = useState("approved");
  const [photos, setPhotos] = useState<MocMediaItem[]>([]);
  const [steps, setSteps] = useState<MocMediaItem[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [busyPdf, setBusyPdf] = useState(false);
  const [message, setMessage] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const builderName =
    session?.user?.name?.trim() ||
    session?.user?.email?.split("@")[0] ||
    "Builder";

  useEffect(() => {
    return () => {
      revokeMediaItems(photos);
      revokeMediaItems(steps);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canBuildPdf = steps.length > 0 && mocName.trim().length > 0;
  const photosBytes = useMemo(
    () => photos.reduce((sum, item) => sum + item.file.size, 0),
    [photos],
  );
  const stepsBytes = useMemo(
    () => steps.reduce((sum, item) => sum + item.file.size, 0),
    [steps],
  );
  const pdfBytes = pdfBlob?.size ?? 0;
  const largestPhoto = useMemo(
    () => photos.reduce((max, item) => Math.max(max, item.file.size), 0),
    [photos],
  );
  const largestStep = useMemo(
    () => steps.reduce((max, item) => Math.max(max, item.file.size), 0),
    [steps],
  );
  const oversizeFile =
    isOverUploadLimit(pdfBytes) ||
    isOverUploadLimit(largestPhoto) ||
    isOverUploadLimit(largestStep);
  const canSubmit = useMemo(
    () =>
      (isAdmin || Boolean(session?.user?.id)) &&
      mocName.trim() &&
      theme.trim() &&
      photos.length > 0 &&
      steps.length > 0 &&
      Boolean(pdfBlob) &&
      !oversizeFile,
    [
      isAdmin,
      session?.user?.id,
      mocName,
      theme,
      photos.length,
      steps.length,
      pdfBlob,
      oversizeFile,
    ],
  );

  async function onBuildPdf() {
    setMessage("");
    setBusyPdf(true);
    try {
      // Start roomy, then shrink automatically if the PDF would fail Blob upload.
      const presets: Array<{ maxEdge: number; quality: number }> = [
        { maxEdge: 1200, quality: 0.72 },
        { maxEdge: 1000, quality: 0.65 },
        { maxEdge: 850, quality: 0.58 },
      ];
      const maxPdfBytes = 95 * 1024 * 1024;
      let blob: Blob | null = null;
      let used = presets[0];
      for (const preset of presets) {
        used = preset;
        blob = await buildInstructionsPdf({
          mocName: mocName.trim(),
          builderName,
          steps,
          maxEdge: preset.maxEdge,
          quality: preset.quality,
        });
        if (blob.size <= maxPdfBytes) break;
      }
      if (!blob) throw new Error("Could not build PDF");
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(blob);
      setPdfBlob(blob);
      setPdfUrl(url);
      const mb = (blob.size / (1024 * 1024)).toFixed(1);
      setMessage(
        `Instructions PDF ready with ${steps.length} step${steps.length === 1 ? "" : "s"} (${mb} MB${used.maxEdge < 1200 ? ", compressed for upload" : ""}).`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not build PDF",
      );
    } finally {
      setBusyPdf(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isAdmin && !session?.user?.id) {
      setMessage("Log in to submit a MOC.");
      setStatus("error");
      return;
    }
    if (!pdfBlob) {
      setMessage("Build the instructions PDF before submitting.");
      setStatus("error");
      return;
    }
    if (oversizeFile) {
      setMessage(
        `A file is over the ${formatBytes(MOC_UPLOAD_LIMIT_BYTES)} upload limit. PDF is ${formatBytes(pdfBytes)}. Rebuild the PDF or remove large photos.`,
      );
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage(useBlobUploads ? "Uploading files…" : "");

    try {
      const endpoint = isAdmin ? "/api/admin/create-moc" : "/api/submit-moc";
      let response: Response;

      if (useBlobUploads) {
        const assets = await uploadMocAssets({
          photos,
          steps,
          pdfBlob,
          mocName: mocName.trim(),
          onProgress: setMessage,
        });
        setMessage("Saving submission…");
        const sellPrice =
          !isAdmin && canSell && wantToSell && priceUsd.trim()
            ? priceUsd.trim()
            : undefined;
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mocName: mocName.trim(),
            theme: theme.trim(),
            youtubeUrl: youtubeUrl.trim() || undefined,
            status: isAdmin ? adminStatus : undefined,
            priceUsd: sellPrice,
            photoUrls: assets.photoUrls,
            instructionUrls: assets.instructionUrls,
            pdfUrl: assets.pdfUrl,
          }),
        });
      } else {
        const data = new FormData();
        data.set("mocName", mocName.trim());
        data.set("theme", theme.trim());
        if (youtubeUrl.trim()) data.set("youtubeUrl", youtubeUrl.trim());
        if (isAdmin) data.set("status", adminStatus);
        if (!isAdmin && canSell && wantToSell && priceUsd.trim()) {
          data.set("priceUsd", priceUsd.trim());
        }

        photos.forEach((item, index) => {
          const named = new File(
            [item.file],
            `photo-${String(index + 1).padStart(2, "0")}-${item.file.name}`,
            { type: item.file.type },
          );
          data.append("photos", named);
        });

        steps.forEach((item, index) => {
          const named = new File(
            [item.file],
            `step-${String(index + 1).padStart(2, "0")}-${item.file.name}`,
            { type: item.file.type },
          );
          data.append("instructions", named);
        });

        data.append(
          "instructionPdf",
          new File(
            [pdfBlob],
            `${mocName.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "moc"}-instructions.pdf`,
            { type: "application/pdf" },
          ),
        );

        response = await fetch(endpoint, {
          method: "POST",
          body: data,
        });
      }

      const json = (await response.json()) as { error?: string; id?: string };
      if (!response.ok) throw new Error(json.error || "Submit failed");

      setStatus("done");
      setSubmittedId(json.id || null);
      setMessage(
        isAdmin
          ? "MOC created in the admin portal."
          : "Thanks! Your MOC was submitted for review. Track its status anytime in My MOCs.",
      );
      revokeMediaItems(photos);
      revokeMediaItems(steps);
      setPhotos([]);
      setSteps([]);
      setPdfBlob(null);
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setMocName("");
      setTheme("");
      setYoutubeUrl("");
      setPriceUsd("");
      setWantToSell(false);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Submit failed");
    }
  }

  if (!isAdmin && sessionStatus === "loading") {
    return <p className="text-sm text-white/60">Checking your account…</p>;
  }

  if (!isAdmin && !session?.user) {
    return (
      <div className="border border-white/15 px-5 py-8 text-white/70">
        <p>You need to be logged in to create and submit a MOC.</p>
        <Link
          href="/login?next=/submit-your-mocs"
          className="mt-4 inline-block bg-brand-orange px-5 py-3 text-xs font-bold tracking-[0.14em] text-white"
        >
          LOG IN TO CONTINUE
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="grid gap-4 border border-white/15 p-5 md:grid-cols-2">
        {!isAdmin ? (
          <div className="md:col-span-2 border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            Submitting as{" "}
            <span className="font-semibold text-white">{builderName}</span>
            {session?.user?.email ? (
              <>
                {" "}
                · <span className="text-white/55">{session.user.email}</span>
              </>
            ) : null}
          </div>
        ) : (
          <div className="md:col-span-2 border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            Staff upload — attributed to your admin account. Defaults to
            approved so it skips the public review queue.
          </div>
        )}
        <label className="block space-y-2">
          <span className="text-sm text-white">MOC Name</span>
          <input
            value={mocName}
            onChange={(event) => {
              setMocName(event.target.value);
              setPdfBlob(null);
              if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
                setPdfUrl(null);
              }
            }}
            required
            className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm text-white">Theme</span>
          <input
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            required
            placeholder="Desert racing, flex axle, etc."
            className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
          />
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm text-white">YouTube video link (optional)</span>
          <input
            value={youtubeUrl}
            onChange={(event) => setYoutubeUrl(event.target.value)}
            type="url"
            placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
            className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
          />
          <span className="block text-xs text-white/45">
            Upload your video on YouTube, then paste the link here. We&apos;ll
            embed it on your Build page — no giant video uploads needed.
          </span>
        </label>
        {!isAdmin ? (
          <div className="space-y-3 border border-white/15 bg-black/40 p-4 md:col-span-2">
            <p className="text-sm font-semibold tracking-[0.08em] text-white">
              SELL YOUR MOC
            </p>
            {canSell ? (
              <>
                <label className="flex items-center gap-2 text-sm text-white/75">
                  <input
                    type="checkbox"
                    checked={wantToSell}
                    onChange={(event) => setWantToSell(event.target.checked)}
                  />
                  List this MOC for sale if it&apos;s approved
                </label>
                {wantToSell ? (
                  <label className="block space-y-2">
                    <span className="text-sm text-white">Sale price (USD)</span>
                    <input
                      value={priceUsd}
                      onChange={(event) => setPriceUsd(event.target.value)}
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="9.99"
                      required={wantToSell}
                      className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
                    />
                    <span className="block text-xs text-white/45">
                      Membership perk unlocked — set what shoppers pay for your
                      instructions. Leave unchecked to publish as a free build.
                    </span>
                  </label>
                ) : (
                  <p className="text-xs text-white/45">
                    You can still upload for free. Check the box above when you
                    want to profit from this MOC.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2 text-sm text-white/70">
                <p>
                  Anyone can upload MOCs for free.{" "}
                  <span className="text-white">
                    Selling (setting a price) is a Badlands Plan membership perk.
                  </span>
                </p>
                <Link
                  href="/plan"
                  className="inline-flex bg-brand-orange px-4 py-2 text-xs font-bold tracking-[0.14em] text-white hover:bg-orange-500"
                >
                  JOIN MEMBERSHIP · {planPriceLabel}
                </Link>
              </div>
            )}
          </div>
        ) : null}
        {isAdmin ? (
          <label className="block space-y-2 md:col-span-2">
            <span className="text-sm text-white">Status</span>
            <select
              value={adminStatus}
              onChange={(event) => setAdminStatus(event.target.value)}
              className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-brand-orange"
            >
              <option value="approved">Approved</option>
              <option value="new">Pending review</option>
              <option value="needs_changes">Needs changes</option>
            </select>
          </label>
        ) : null}
      </section>

      <ImageOrganizer
        title="1. SHOWCASE PHOTOS"
        hint="These are the hero shots of your finished MOC. Drag cards or use Up/Down to set the order."
        emptyLabel="Add clear photos of your finished build."
        items={photos}
        onChange={setPhotos}
      />

      <ImageOrganizer
        title="2. INSTRUCTION STEPS"
        hint="Upload each build step as a photo, then put them in the exact order kids should follow."
        emptyLabel="Add instruction step photos in order — step 1, step 2, and so on."
        items={steps}
        onChange={(next) => {
          setSteps(next);
          setPdfBlob(null);
          if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
          }
        }}
      />

      <section className="space-y-4 border border-white/15 p-5">
        <h2 className="font-display text-2xl tracking-[0.06em] text-white">
          3. BUILD INSTRUCTIONS PDF
        </h2>
        <p className="text-sm text-white/60">
          We turn your ordered step photos into an easy PDF — cover page plus
          one page per step. No Acrobat needed.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canBuildPdf || busyPdf}
            onClick={() => void onBuildPdf()}
            className="bg-brand-orange px-5 py-3 text-xs font-bold tracking-[0.14em] text-white disabled:opacity-50"
          >
            {busyPdf ? "BUILDING PDF…" : "MAKE PDF FROM STEPS"}
          </button>
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="border border-white/30 px-5 py-3 text-xs font-bold tracking-[0.14em] text-white hover:border-brand-orange hover:text-brand-orange"
            >
              PREVIEW / DOWNLOAD PDF
            </a>
          ) : null}
        </div>
        {pdfBlob ? (
          <div className="space-y-1 text-sm">
            <p
              className={
                isOverUploadLimit(pdfBytes)
                  ? "font-semibold text-red-400"
                  : "text-brand-orange"
              }
            >
              PDF size: {formatBytes(pdfBytes)}
              {isOverUploadLimit(pdfBytes)
                ? ` — over the ${formatBytes(MOC_UPLOAD_LIMIT_BYTES)} limit`
                : ` / ${formatBytes(MOC_UPLOAD_LIMIT_BYTES)} limit`}
            </p>
            <p className="text-white/55">
              PDF locked to your current step order. Reorder steps? Make the PDF
              again before submit.
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/45">
            Build the PDF to see its exact file size before upload.
          </p>
        )}
      </section>

      <section className="border border-white/15 px-5 py-4 text-sm text-white/70">
        <h2 className="font-display text-xl tracking-[0.06em] text-white">
          FILE SIZES
        </h2>
        <ul className="mt-3 space-y-1">
          <li>
            Showcase photos: {photos.length} · {formatBytes(photosBytes)}
            {largestPhoto > 0
              ? ` (largest ${formatBytes(largestPhoto)})`
              : ""}
          </li>
          <li>
            Instruction steps: {steps.length} · {formatBytes(stepsBytes)}
            {largestStep > 0 ? ` (largest ${formatBytes(largestStep)})` : ""}
          </li>
          <li>
            Instructions PDF:{" "}
            {pdfBlob ? formatBytes(pdfBytes) : "not built yet"}
          </li>
          <li className="text-white/45">
            Per-file upload limit: {formatBytes(MOC_UPLOAD_LIMIT_BYTES)}
          </li>
        </ul>
        {oversizeFile ? (
          <p className="mt-3 text-red-400">
            One or more files are too large to upload. Rebuild the PDF (it
            auto-compresses) or remove the biggest photos.
          </p>
        ) : null}
      </section>

      {message ? (
        <div
          className={`space-y-2 text-sm ${
            status === "error" ? "text-red-400" : "text-green-400"
          }`}
        >
          <p>{message}</p>
          {status === "done" ? (
            <p>
              {isAdmin ? (
                <>
                  <Link href="/admin/mocs" className="text-brand-orange underline">
                    Back to MOC Reviews
                  </Link>
                  {submittedId ? (
                    <>
                      {" "}
                      or{" "}
                      <Link
                        href={`/admin/mocs/${submittedId}`}
                        className="text-brand-orange underline"
                      >
                        open this MOC
                      </Link>
                    </>
                  ) : null}
                </>
              ) : (
                <>
                  <Link href="/my-mocs" className="text-brand-orange underline">
                    Open My MOCs
                  </Link>
                  {submittedId ? (
                    <>
                      {" "}
                      or{" "}
                      <Link
                        href={`/my-mocs/${submittedId}`}
                        className="text-brand-orange underline"
                      >
                        view this submission
                      </Link>
                    </>
                  ) : null}
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading" || !canSubmit}
        className="w-full border-2 border-brand-orange bg-black px-6 py-4 text-sm font-bold tracking-[0.16em] text-brand-orange transition hover:bg-brand-orange hover:text-white disabled:opacity-50"
      >
        {status === "loading"
          ? isAdmin
            ? "CREATING…"
            : "SUBMITTING…"
          : isAdmin
            ? "CREATE MOC"
            : "SUBMIT MOC FOR REVIEW"}
      </button>
    </form>
  );
}
