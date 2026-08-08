import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { mocStatusClass, mocStatusLabel } from "@/lib/moc-review";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "My MOCs" };

export default async function MyMocsPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    redirect("/login?next=/my-mocs");
  }

  const email = session.user.email.toLowerCase();
  const submissions = await prisma.mocSubmission.findMany({
    where: {
      OR: [{ submitterUserId: session.user.id }, { builderEmail: email }],
    },
    include: {
      _count: { select: { reviewNotes: true } },
      reviewNotes: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      product: { select: { slug: true, isActive: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
            MY MOCS
          </h1>
          <p className="mt-3 text-white/70">
            Track every submission — pending, needs changes, approved, or denied.
          </p>
        </div>
        <Link
          href="/submit-your-mocs"
          className="inline-block bg-brand-orange px-5 py-3 text-center text-xs font-bold tracking-[0.14em] text-white"
        >
          SUBMIT A MOC
        </Link>
      </div>

      <div className="mt-10 space-y-4">
        {submissions.length === 0 ? (
          <div className="border border-white/15 px-5 py-8 text-white/60">
            <p>No submissions yet.</p>
            <Link href="/submit-your-mocs" className="mt-3 inline-block text-brand-orange">
              Build and submit your first MOC
            </Link>
          </div>
        ) : (
          submissions.map((submission) => {
            const latestNote = submission.reviewNotes[0];
            return (
              <Link
                key={submission.id}
                href={`/my-mocs/${submission.id}`}
                className="block border border-white/15 px-5 py-4 transition hover:border-brand-orange"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-2xl tracking-[0.06em] text-white">
                      {submission.mocName.toUpperCase()}
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      Theme: {submission.theme} · Submitted{" "}
                      {submission.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold uppercase tracking-[0.12em] ${mocStatusClass(submission.status)}`}
                  >
                    {mocStatusLabel(submission.status)}
                  </span>
                </div>
                {latestNote ? (
                  <p className="mt-3 line-clamp-2 text-sm text-white/70">
                    Latest note: {latestNote.body}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-white/45">
                    Waiting for Badlands review.
                  </p>
                )}
                <p className="mt-2 text-xs text-white/40">
                  {submission._count.reviewNotes} review note
                  {submission._count.reviewNotes === 1 ? "" : "s"}
                  {submission.product?.isActive
                    ? " · Live in Build"
                    : ""}{" "}
                  · View details →
                </p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
