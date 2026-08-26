import Link from "next/link";
import { adminPasswordLoginAction } from "@/app/admin/actions";
import { getAdminAccess } from "@/lib/admin";
import { auth } from "@/lib/auth";
import {
  countFoundingMembers,
  getFoundingMemberLimit,
} from "@/lib/founding-members";
import { mocStatusClass, mocStatusLabel } from "@/lib/moc-review";
import { PLAN_ACCESS_STATUSES } from "@/lib/plan";
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
  const session = await auth();

  if (!access) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl text-white">ADMIN PORTAL</h1>
        <p className="mt-3 text-sm text-white/60">
          Staff: log into your Badlands account, then open Admin portal from
          your avatar menu. Owner emergency access still uses the password
          below.
        </p>
        {session?.user ? (
          <p className="mt-4 text-sm text-yellow-300">
            You&apos;re logged in as {session.user.email}, but this account is
            not an admin/reviewer yet.
          </p>
        ) : (
          <p className="mt-4 text-sm text-white/50">
            <Link href="/login?next=/admin" className="text-brand-orange">
              Log in
            </Link>{" "}
            with your staff account first.
          </p>
        )}
        {error === "1" && (
          <p className="mt-4 text-sm text-red-400">Incorrect password.</p>
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
      </div>
    );
  }

  const since = new Date(Date.now() - 2 * 60 * 1000);
  const planStatuses = [...PLAN_ACCESS_STATUSES];
  const [
    pendingMocs,
    approvedMocs,
    deniedMocs,
    needsChanges,
    orderCount,
    contactCount,
    userCount,
    memberCount,
    foundingCount,
    onlineCount,
    unreadAlerts,
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
    prisma.planSubscription.count({
      where: { status: { in: planStatuses } },
    }),
    countFoundingMembers(),
    prisma.presenceSession.count({ where: { lastSeenAt: { gte: since } } }),
    prisma.adminNotification.count({ where: { readAt: null } }),
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

  const foundingLimit = getFoundingMemberLimit();

  const cards = [
    { label: "Pending MOCs", value: pendingMocs, href: "/admin/mocs?status=new" },
    { label: "Needs changes", value: needsChanges, href: "/admin/mocs?status=needs_changes" },
    { label: "Approved MOCs", value: approvedMocs, href: "/admin/mocs?status=approved" },
    { label: "Denied MOCs", value: deniedMocs, href: "/admin/mocs?status=denied" },
    { label: "Orders", value: orderCount, href: "/admin/ops#orders" },
    { label: "Messages", value: contactCount, href: "/admin/ops#messages" },
    { label: "Unread alerts", value: unreadAlerts, href: "/admin/notifications" },
    { label: "Online now", value: onlineCount, href: "/admin/team" },
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

      <section className="border border-brand-orange/35 bg-brand-orange/5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-white">
              People & membership
            </h2>
            <p className="mt-1 text-sm text-white/55">
              Everyone who signed up, plus active Badlands Plan subscribers.
            </p>
          </div>
          <Link
            href="/admin/team"
            className="text-xs tracking-[0.12em] text-brand-orange hover:underline"
          >
            VIEW ALL ACCOUNTS →
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Link
            href="/admin/team"
            className="border border-white/15 bg-black/40 px-4 py-4 transition hover:border-brand-orange"
          >
            <p className="text-xs tracking-[0.14em] text-white/50">
              JOINED BADLANDS
            </p>
            <p className="mt-2 font-display text-4xl text-white">{userCount}</p>
            <p className="mt-1 text-xs text-white/45">Total accounts signed up</p>
          </Link>
          <Link
            href="/admin/team?access=members"
            className="border border-white/15 bg-black/40 px-4 py-4 transition hover:border-brand-orange"
          >
            <p className="text-xs tracking-[0.14em] text-white/50">
              PLAN SUBSCRIBERS
            </p>
            <p className="mt-2 font-display text-4xl text-brand-orange">
              {memberCount}
            </p>
            <p className="mt-1 text-xs text-white/45">
              Active Badlands Plan members
            </p>
          </Link>
          <Link
            href="/admin/team?access=founding"
            className="border border-white/15 bg-black/40 px-4 py-4 transition hover:border-brand-orange"
          >
            <p className="text-xs tracking-[0.14em] text-white/50">
              FOUNDING MEMBERS
            </p>
            <p className="mt-2 font-display text-4xl text-white">
              {foundingCount}
              <span className="text-2xl text-white/40">/{foundingLimit}</span>
            </p>
            <p className="mt-1 text-xs text-white/45">
              First-month-free slots claimed
            </p>
          </Link>
        </div>
      </section>

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
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-white">Latest MOCs</h2>
            <div className="flex gap-3">
              <Link href="/admin/products" className="text-xs text-brand-orange">
                BUILD CATALOG
              </Link>
              <Link href="/admin/mocs/new" className="text-xs text-white/50 hover:text-brand-orange">
                CREATE MOC
              </Link>
              <Link href="/admin/mocs" className="text-xs text-white/50 hover:text-brand-orange">
                VIEW ALL
              </Link>
            </div>
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
