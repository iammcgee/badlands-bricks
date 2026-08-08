import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin";
import { mocStatusClass, mocStatusLabel } from "@/lib/moc-review";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "MOC Reviews" };

export default async function AdminMocsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");

  const { status } = await searchParams;
  const filter = status && status !== "all" ? { status } : {};

  const submissions = await prisma.mocSubmission.findMany({
    where: filter,
    include: {
      _count: { select: { reviewNotes: true } },
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tabs = [
    { key: "all", label: "All" },
    { key: "new", label: "Pending" },
    { key: "needs_changes", label: "Needs changes" },
    { key: "approved", label: "Approved" },
    { key: "denied", label: "Denied" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-[0.08em] text-white">
            MOC REVIEWS
          </h1>
          <p className="mt-2 text-white/60">
            Approve, deny, or send improvement notes. Builders track status on
            My MOCs; email is optional when you save a review.
          </p>
        </div>
        <Link
          href="/admin/mocs/new"
          className="inline-block bg-brand-orange px-5 py-3 text-center text-xs font-bold tracking-[0.14em] text-white"
        >
          CREATE MOC
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = (status || "all") === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key === "all" ? "/admin/mocs" : `/admin/mocs?status=${tab.key}`}
              className={`border px-3 py-1.5 text-xs tracking-[0.12em] ${
                active
                  ? "border-brand-orange text-brand-orange"
                  : "border-white/20 text-white/70 hover:border-white/50"
              }`}
            >
              {tab.label.toUpperCase()}
            </Link>
          );
        })}
      </div>

      <div className="space-y-3">
        {submissions.length === 0 && (
          <p className="text-white/50">No submissions in this view.</p>
        )}
        {submissions.map((submission) => (
          <Link
            key={submission.id}
            href={`/admin/mocs/${submission.id}`}
            className="block border border-white/15 px-4 py-4 transition hover:border-brand-orange"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{submission.mocName}</p>
                <p className="mt-1 text-sm text-white/60">
                  {submission.builderName || "Unknown"} ·{" "}
                  {submission.builderEmail || "no email"} · Theme:{" "}
                  {submission.theme}
                </p>
              </div>
              <span className={`text-sm uppercase ${mocStatusClass(submission.status)}`}>
                {mocStatusLabel(submission.status)}
              </span>
            </div>
            <p className="mt-2 text-xs text-white/45">
              Submitted {submission.createdAt.toLocaleString()} ·{" "}
              {submission._count.reviewNotes} note
              {submission._count.reviewNotes === 1 ? "" : "s"}
              {submission.reviewedBy
                ? ` · last review by ${submission.reviewedBy.name}`
                : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
