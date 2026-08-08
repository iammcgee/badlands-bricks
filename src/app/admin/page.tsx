import Link from "next/link";
import { adminPasswordLoginAction } from "@/app/admin/actions";
import { getAdminAccess } from "@/lib/admin";
import { mocStatusClass, mocStatusLabel } from "@/lib/moc-review";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const access = await getAdminAccess();

  if (!access) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl text-white">ADMIN PORTAL</h1>
        <p className="mt-3 text-sm text-white/60">
          Sign in with the owner password, or log into a staff account first
          then return here.
        </p>
        {error === "1" && (
          <p className="mt-4 text-sm text-red-400">Incorrect password.</p>
        )}
        {error === "nostaff" && (
          <p className="mt-4 text-sm text-red-400">
            Your account is not a reviewer/admin yet.
          </p>
        )}
        <form action={adminPasswordLoginAction} className="mt-8 space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Owner admin password"
            className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white"
          />
          <button
            type="submit"
            className="w-full bg-brand-orange px-4 py-3 text-sm font-bold tracking-[0.14em] text-white"
          >
            ENTER PORTAL
          </button>
        </form>
        <p className="mt-6 text-sm text-white/50">
          Staff accounts:{" "}
          <Link href="/login?next=/admin" className="text-brand-orange">
            log in
          </Link>{" "}
          then open /admin again.
        </p>
      </div>
    );
  }

  const since = new Date(Date.now() - 2 * 60 * 1000);
  const [
    pendingMocs,
    approvedMocs,
    deniedMocs,
    needsChanges,
    orderCount,
    contactCount,
    userCount,
    onlineCount,
    recentMocs,
    recentOrders,
  ] = await Promise.all([
    prisma.mocSubmission.count({ where: { status: "new" } }),
    prisma.mocSubmission.count({ where: { status: "approved" } }),
    prisma.mocSubmission.count({ where: { status: "denied" } }),
    prisma.mocSubmission.count({ where: { status: "needs_changes" } }),
    prisma.order.count(),
    prisma.contactMessage.count(),
    prisma.user.count(),
    prisma.presenceSession.count({ where: { lastSeenAt: { gte: since } } }),
    prisma.mocSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const cards = [
    { label: "Pending MOCs", value: pendingMocs, href: "/admin/mocs?status=new" },
    { label: "Needs changes", value: needsChanges, href: "/admin/mocs?status=needs_changes" },
    { label: "Approved MOCs", value: approvedMocs, href: "/admin/mocs?status=approved" },
    { label: "Denied MOCs", value: deniedMocs, href: "/admin/mocs?status=denied" },
    { label: "Orders", value: orderCount, href: "/admin/ops#orders" },
    { label: "Messages", value: contactCount, href: "/admin/ops#messages" },
    { label: "Accounts", value: userCount, href: "/admin/team" },
    { label: "Online now", value: onlineCount, href: "/admin/ops#system" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 md:px-8">
      <div>
        <h1 className="font-display text-4xl tracking-[0.08em] text-white">
          BIRDS-EYE VIEW
        </h1>
        <p className="mt-2 text-white/60">
          Snapshot of submissions, shop activity, and live presence.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="border border-white/15 px-4 py-5 transition hover:border-brand-orange"
          >
            <p className="text-xs tracking-[0.14em] text-white/50">
              {card.label.toUpperCase()}
            </p>
            <p className="mt-2 font-display text-4xl text-white">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-white">Latest MOCs</h2>
            <Link href="/admin/mocs" className="text-xs text-brand-orange">
              VIEW ALL
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentMocs.length === 0 && (
              <p className="text-sm text-white/50">No submissions yet.</p>
            )}
            {recentMocs.map((moc) => (
              <Link
                key={moc.id}
                href={`/admin/mocs/${moc.id}`}
                className="block border border-white/15 px-4 py-3 text-sm transition hover:border-brand-orange"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-white">{moc.mocName}</span>
                  <span className={mocStatusClass(moc.status)}>
                    {mocStatusLabel(moc.status)}
                  </span>
                </div>
                <p className="mt-1 text-white/50">
                  {moc.builderName || "Unknown builder"} ·{" "}
                  {moc.createdAt.toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-white">Latest Orders</h2>
            <Link href="/admin/ops#orders" className="text-xs text-brand-orange">
              UNDER THE HOOD
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentOrders.length === 0 && (
              <p className="text-sm text-white/50">No orders yet.</p>
            )}
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="border border-white/15 px-4 py-3 text-sm text-white/80"
              >
                <div className="flex justify-between gap-2">
                  <span>{order.email}</span>
                  <span className="uppercase text-brand-orange">{order.status}</span>
                </div>
                <p className="mt-1 text-white/50">
                  {formatPrice(order.totalCents)} · {order.createdAt.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
