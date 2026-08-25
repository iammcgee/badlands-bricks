import Link from "next/link";
import { redirect } from "next/navigation";
import { reviewMocAction } from "@/app/admin/actions";
import { AdminMocMediaGallery } from "@/components/AdminMocMediaGallery";
import { getAdminAccess } from "@/lib/admin";
import { isRemoteMocPath } from "@/lib/moc-files";
import {
  mocStatusClass,
  mocStatusLabel,
  parseJsonStringArray,
} from "@/lib/moc-review";
import { getCreatorSellAccess } from "@/lib/plan";
import { formatPrice } from "@/lib/products";
import { prisma } from "@/lib/prisma";

function fileHref(path: string) {
  if (isRemoteMocPath(path)) return path;
  return `/api/admin/uploads?path=${encodeURIComponent(path)}`;
}

function fileLabel(path: string) {
  if (isRemoteMocPath(path)) {
    try {
      return new URL(path).pathname.split("/").pop() || path;
    } catch {
      return path;
    }
  }
  return path.split("/").pop() || path;
}

function isImagePath(path: string) {
  const clean = path.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|gif|webp|avif|heic|heif)$/i.test(clean);
}


export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await prisma.mocSubmission.findUnique({ where: { id } });
  return { title: submission ? `Review ${submission.mocName}` : "MOC Review" };
}

export default async function AdminMocDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    saved?: string;
    emailed?: string;
    error?: string;
    published?: string;
    slug?: string;
  }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");

  const { id } = await params;
  const query = await searchParams;

  const submission = await prisma.mocSubmission.findUnique({
    where: { id },
    include: {
      reviewNotes: { orderBy: { createdAt: "desc" } },
      reviewedBy: { select: { name: true, email: true } },
      product: { select: { id: true, slug: true, isActive: true, priceCents: true } },
    },
  });
  if (!submission) redirect("/admin/mocs");

  const photos = parseJsonStringArray(submission.photoPathsJson);
  const instructions = parseJsonStringArray(submission.instructionPathsJson);
  const photoItems = photos.map((path, index) => ({
    src: fileHref(path),
    label: fileLabel(path) || `Photo ${index + 1}`,
  }));
  const instructionImages = instructions
    .filter(isImagePath)
    .map((path, index) => ({
      src: fileHref(path),
      label: fileLabel(path) || `Step ${index + 1}`,
    }));
  const instructionDocs = instructions.filter((path) => !isImagePath(path));
  const sellAccess = await getCreatorSellAccess(submission.submitterUserId);
  const requestedPrice =
    submission.requestedPriceCents != null && submission.requestedPriceCents > 0
      ? formatPrice(submission.requestedPriceCents)
      : null;
  const existingPrice =
    submission.product?.priceCents != null
      ? (submission.product.priceCents / 100).toFixed(2)
      : requestedPrice
        ? (submission.requestedPriceCents! / 100).toFixed(2)
        : "0";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
      <div>
        <Link href="/admin/mocs" className="text-xs text-white/50 hover:text-brand-orange">
          ← BACK TO MOC REVIEWS
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-[0.08em] text-white">
          {submission.mocName.toUpperCase()}
        </h1>
        <p className={`mt-2 text-sm uppercase ${mocStatusClass(submission.status)}`}>
          {mocStatusLabel(submission.status)}
        </p>
      </div>

      {query.saved && (
        <p className="border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          Review saved
          {query.published === "1" && query.slug
            ? " and published to Build."
            : ""}
          {query.emailed === "1"
            ? " Email sent to the builder."
            : query.emailed === "0"
              ? " Email was skipped (no RESEND_API_KEY or delivery issue)."
              : ""}
          {query.published === "1" && query.slug ? (
            <>
              {" "}
              <Link
                href={`/build/${query.slug}`}
                className="underline hover:text-white"
              >
                View in Build
              </Link>
            </>
          ) : null}
        </p>
      )}
      {query.error === "publish" ? (
        <p className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          Review status saved path failed while publishing to Build. Try again.
        </p>
      ) : null}
      {query.error && query.error !== "publish" ? (
        <p className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          Could not save review. Add notes and choose a decision.
        </p>
      ) : null}
      {submission.product?.isActive ? (
        <p className="border border-white/15 px-4 py-3 text-sm text-white/70">
          Live in Build as{" "}
          <Link
            href={`/build/${submission.product.slug}`}
            className="text-brand-orange hover:underline"
          >
            /build/{submission.product.slug}
          </Link>
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-4 border border-white/15 p-5 text-sm text-white/80">
          <h2 className="font-display text-2xl text-white">Submission</h2>
          <p>
            <span className="text-white/50">Builder:</span>{" "}
            {submission.builderName || "—"}
          </p>
          <p>
            <span className="text-white/50">Email:</span>{" "}
            {submission.builderEmail || "—"}
          </p>
          <p>
            <span className="text-white/50">Theme:</span> {submission.theme}
          </p>
          <p>
            <span className="text-white/50">Sell request:</span>{" "}
            {requestedPrice ? (
              <span className="text-brand-orange">{requestedPrice}</span>
            ) : (
              "Free listing"
            )}
          </p>
          <p>
            <span className="text-white/50">Sell access:</span>{" "}
            {sellAccess.reason === "early_creator" ? (
              <span className="text-green-400">
                Founding Creator #{sellAccess.earlyCreatorNumber} — can sell
              </span>
            ) : sellAccess.reason === "membership" ? (
              <span className="text-green-400">
                Active membership — can sell
              </span>
            ) : (
              <span className="text-white/70">
                No sell access — paid price will publish as free
              </span>
            )}
          </p>
          {submission.youtubeUrl ? (
            <p>
              <span className="text-white/50">YouTube:</span>{" "}
              <a
                href={submission.youtubeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-orange hover:underline"
              >
                Watch video
              </a>
            </p>
          ) : null}
          <p>
            <span className="text-white/50">Submitted:</span>{" "}
            {submission.createdAt.toLocaleString()}
          </p>
          {submission.notes ? (
            <div>
              <p className="text-white/50">Builder notes</p>
              <p className="mt-1 whitespace-pre-wrap">{submission.notes}</p>
            </div>
          ) : null}
          {submission.reviewedBy ? (
            <p className="text-white/50">
              Last reviewed by {submission.reviewedBy.name}
              {submission.reviewedAt
                ? ` · ${submission.reviewedAt.toLocaleString()}`
                : ""}
            </p>
          ) : null}

          <AdminMocMediaGallery
            title="Showcase photos"
            items={photoItems}
            emptyLabel="No showcase photos stored"
          />
          <AdminMocMediaGallery
            title="Instruction step photos"
            items={instructionImages}
            emptyLabel="No instruction step photos stored"
          />
          {instructionDocs.length > 0 ? (
            <div>
              <p className="mb-2 text-white/50">Instruction files (PDF / other)</p>
              <ul className="space-y-1 text-xs text-white/70">
                {instructionDocs.map((path) => (
                  <li key={path}>
                    <a
                      href={fileHref(path)}
                      className="text-brand-orange hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {fileLabel(path)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-xs text-white/40">
            Click any photo to open the gallery and scroll through the set with
            arrows or keyboard. Files open from Vercel Blob when{" "}
            <code className="text-white/60">BLOB_READ_WRITE_TOKEN</code> is
            configured; otherwise they only persist on local disk.
          </p>
        </section>

        <section className="space-y-4 border border-white/15 p-5">
          <h2 className="font-display text-2xl text-white">Review decision</h2>
          <form action={reviewMocAction} className="space-y-4">
            <input type="hidden" name="id" value={submission.id} />
            <label className="block space-y-2 text-sm">
              <span className="text-white/70">Decision</span>
              <select
                name="decision"
                defaultValue={submission.status === "new" ? "approved" : submission.status}
                className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
              >
                <option value="approved">Approve</option>
                <option value="denied">Deny</option>
                <option value="needs_changes">Needs changes</option>
                <option value="note">Note only (keep status)</option>
              </select>
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-white/70">
                Shop price if approved (USD)
              </span>
              <input
                type="number"
                name="priceUsd"
                min="0"
                step="0.01"
                defaultValue={existingPrice}
                className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
              />
              <span className="block text-xs text-white/45">
                Approving publishes this MOC to Build. Paid prices only stick if
                the builder has an active Badlands Plan; otherwise the shop
                price is forced to free. Use 0 for a free listing.
              </span>
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-white/70">Notes to builder</span>
              <textarea
                name="body"
                required
                rows={7}
                placeholder="Explain what looks great and what needs improvement..."
                className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                name="sendEmail"
                defaultChecked={Boolean(submission.builderEmail)}
                disabled={!submission.builderEmail}
              />
              Email these notes to the builder
              {!submission.builderEmail ? " (no email on file)" : ""}
            </label>
            <button
              type="submit"
              className="bg-brand-orange px-5 py-3 text-sm font-bold tracking-[0.14em] text-white"
            >
              SAVE REVIEW
            </button>
          </form>
        </section>
      </div>

      <section>
        <h2 className="font-display text-2xl text-white">Review history</h2>
        <div className="mt-4 space-y-3">
          {submission.reviewNotes.length === 0 && (
            <p className="text-sm text-white/50">No review notes yet.</p>
          )}
          {submission.reviewNotes.map((note) => (
            <div
              key={note.id}
              className="border border-white/15 px-4 py-3 text-sm text-white/80"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-semibold text-white">{note.authorLabel}</span>
                <span className="text-white/45">
                  {note.createdAt.toLocaleString()}
                  {note.decision ? ` · ${mocStatusLabel(note.decision)}` : ""}
                  {note.emailed ? " · emailed" : ""}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
