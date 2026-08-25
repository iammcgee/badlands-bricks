import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { mocStatusClass, mocStatusLabel } from "@/lib/moc-review";
import { getCreatorSellAccess } from "@/lib/plan";
import { formatPrice } from "@/lib/products";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const submission = await prisma.mocSubmission.findUnique({ where: { id } });
  return { title: submission ? submission.mocName : "My MOC" };
}

export default async function MyMocDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login?next=/my-mocs");
  }

  const { id } = await params;
  const email = session.user.email.toLowerCase();
  const submission = await prisma.mocSubmission.findUnique({
    where: { id },
    include: {
      reviewNotes: { orderBy: { createdAt: "desc" } },
      product: { select: { slug: true, isActive: true, priceCents: true } },
    },
  });

  if (!submission) notFound();

  const owned =
    submission.submitterUserId === session.user.id ||
    submission.builderEmail.toLowerCase() === email;
  if (!owned) notFound();

  const sellAccess = await getCreatorSellAccess(session.user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 md:px-8">
      <div>
        <Link href="/my-mocs" className="text-xs text-white/50 hover:text-brand-orange">
          ← BACK TO MY MOCS
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
          {submission.mocName.toUpperCase()}
        </h1>
        <p className={`mt-2 text-sm font-bold uppercase tracking-[0.12em] ${mocStatusClass(submission.status)}`}>
          {mocStatusLabel(submission.status)}
        </p>
        {submission.product?.isActive ? (
          <Link
            href={`/build/${submission.product.slug}`}
            className="mt-4 inline-block bg-brand-orange px-5 py-3 text-xs font-bold tracking-[0.14em] text-white"
          >
            VIEW IN BUILD
          </Link>
        ) : null}
      </div>

      <section className="space-y-2 border border-white/15 p-5 text-sm text-white/75">
        <p>
          <span className="text-white/45">Theme:</span> {submission.theme}
        </p>
        <p>
          <span className="text-white/45">Listing:</span>{" "}
          {submission.product?.isActive
            ? submission.product.priceCents > 0
              ? `For sale · ${formatPrice(submission.product.priceCents)}`
              : "Free in Build"
            : submission.requestedPriceCents && submission.requestedPriceCents > 0
              ? `Requested sale price ${formatPrice(submission.requestedPriceCents)} (pending review)`
              : "Free upload"}
        </p>
        {!sellAccess.canSell ? (
          <p className="border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
            Want to sell this MOC for profit?{" "}
            <Link href="/plan" className="text-brand-orange hover:underline">
              Join Badlands Plan
            </Link>{" "}
            to unlock paid listings, or sign up early for a Founding Creator
            spot (first 30 accounts). Uploading stays free either way.
          </p>
        ) : sellAccess.reason === "early_creator" ? (
          <p className="border border-brand-orange/30 bg-brand-orange/5 px-3 py-2 text-xs text-brand-orange">
            Founding Creator #{sellAccess.earlyCreatorNumber} — you can list
            MOCs for sale without a paid membership.
          </p>
        ) : null}
        {submission.youtubeUrl ? (
          <p>
            <span className="text-white/45">YouTube:</span>{" "}
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
          <span className="text-white/45">Submitted:</span>{" "}
          {submission.createdAt.toLocaleString()}
        </p>
        {submission.reviewedAt ? (
          <p>
            <span className="text-white/45">Last reviewed:</span>{" "}
            {submission.reviewedAt.toLocaleString()}
          </p>
        ) : null}
        {submission.notes ? (
          <div>
            <p className="text-white/45">Your notes</p>
            <p className="mt-1 whitespace-pre-wrap">{submission.notes}</p>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-2xl text-white">Review updates</h2>
        <div className="mt-4 space-y-3">
          {submission.reviewNotes.length === 0 ? (
            <p className="border border-white/15 px-4 py-5 text-sm text-white/55">
              No reviewer notes yet. Hang tight — your MOC is in the queue.
            </p>
          ) : (
            submission.reviewNotes.map((note) => (
              <div
                key={note.id}
                className="border border-white/15 px-4 py-3 text-sm text-white/80"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold text-white">
                    {note.decision
                      ? mocStatusLabel(note.decision)
                      : "Note from Badlands"}
                  </span>
                  <span className="text-white/45">
                    {note.createdAt.toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {submission.status === "needs_changes" ? (
        <Link
          href="/submit-your-mocs"
          className="inline-block border border-brand-orange px-5 py-3 text-xs font-bold tracking-[0.14em] text-brand-orange"
        >
          SUBMIT AN UPDATED VERSION
        </Link>
      ) : null}
    </div>
  );
}
