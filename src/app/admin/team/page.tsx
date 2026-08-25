import Link from "next/link";
import { redirect } from "next/navigation";
import {
  deleteUserAccountAction,
  resetUserPasswordAction,
  setStaffRoleAction,
} from "@/app/admin/actions";
import { getAdminAccess } from "@/lib/admin";
import { PLAN_ACCESS_STATUSES } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Team" };

/** Same window as site online counter / overview. */
const LIVE_WINDOW_MS = 2 * 60 * 1000;

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    passwordReset?: string;
    deleted?: string;
    q?: string;
  }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");

  const query = await searchParams;
  const search = (query.q || "").trim();
  const liveSince = new Date(Date.now() - LIVE_WINDOW_MS);

  const [staff, accounts, liveSessions] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["admin", "reviewer"] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        foundingMemberNumber: true,
        createdAt: true,
        planSubscription: {
          select: { status: true, cancelAtPeriodEnd: true },
        },
      },
    }),
    prisma.presenceSession.findMany({
      where: {
        userId: { not: null },
        lastSeenAt: { gte: liveSince },
      },
      select: { userId: true, lastSeenAt: true },
      orderBy: { lastSeenAt: "desc" },
    }),
  ]);

  const liveByUserId = new Map<string, Date>();
  for (const session of liveSessions) {
    if (!session.userId) continue;
    if (!liveByUserId.has(session.userId)) {
      liveByUserId.set(session.userId, session.lastSeenAt);
    }
  }

  const liveUserIds = [...liveByUserId.keys()];
  const [liveAccountRows, anonymousLiveCount] = await Promise.all([
    liveUserIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: liveUserIds } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
      : Promise.resolve([]),
    prisma.presenceSession.count({
      where: {
        userId: null,
        lastSeenAt: { gte: liveSince },
      },
    }),
  ]);

  const liveAccounts = liveAccountRows.sort((a, b) => {
    const aSeen = liveByUserId.get(a.id)?.getTime() ?? 0;
    const bSeen = liveByUserId.get(b.id)?.getTime() ?? 0;
    return bSeen - aSeen;
  });

  const liveCount = accounts.filter((user) => liveByUserId.has(user.id)).length;
  const sortedAccounts = [...accounts].sort((a, b) => {
    const aLive = liveByUserId.has(a.id) ? 1 : 0;
    const bLive = liveByUserId.has(b.id) ? 1 : 0;
    if (aLive !== bLive) return bLive - aLive;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const canManage = access.role === "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
      <div>
        <h1 className="font-display text-4xl tracking-[0.08em] text-white">
          TEAM
        </h1>
        <p className="mt-2 text-white/60">
          Every Badlands account, live status by name, roles, and account tools.
        </p>
      </div>

      <section className="border border-green-400/30 bg-green-400/5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-white">Live right now</h2>
            <p className="mt-1 text-sm text-white/55">
              Signed-in accounts active in the last 2 minutes
              {anonymousLiveCount > 0
                ? ` · plus ${anonymousLiveCount} guest tab${anonymousLiveCount === 1 ? "" : "s"} (not signed in)`
                : ""}
            </p>
          </div>
          <p className="text-sm font-bold tracking-[0.14em] text-green-400">
            {liveAccounts.length} ACCOUNT{liveAccounts.length === 1 ? "" : "S"} LIVE
          </p>
        </div>
        {liveAccounts.length === 0 ? (
          <p className="mt-4 text-sm text-white/50">
            No signed-in accounts are live right now. The footer counter can
            still show guests browsing without logging in.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10 border border-white/10">
            {liveAccounts.map((user) => {
              const seen = liveByUserId.get(user.id);
              return (
                <li
                  key={user.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-white">
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
                      {user.name}
                    </p>
                    <p className="text-sm text-white/55">
                      {user.email} · {user.role}
                    </p>
                  </div>
                  <p className="text-xs tracking-[0.12em] text-green-400/80">
                    LAST SEEN{" "}
                    {seen
                      ? seen.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "just now"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {query.saved && (
        <p className="text-sm text-brand-orange">Team role updated.</p>
      )}
      {query.passwordReset && (
        <p className="text-sm text-brand-orange">Password reset.</p>
      )}
      {query.deleted && (
        <p className="text-sm text-brand-orange">
          Account deleted. They can sign up again with that email.
        </p>
      )}
      {query.error === "notfound" && (
        <p className="text-sm text-red-400">
          No account with that email. Ask them to sign up first, then add them
          here.
        </p>
      )}
      {query.error === "forbidden" && (
        <p className="text-sm text-red-400">Only admins can manage the team.</p>
      )}
      {query.error === "invalid" && (
        <p className="text-sm text-red-400">
          Invalid email/role, or password must be at least 6 characters.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-white">Current staff</h2>
        {staff.length === 0 && (
          <p className="text-sm text-white/50">
            No staff roles yet. Use the owner password, then promote accounts
            below.
          </p>
        )}
        {staff.map((member) => (
          <div
            key={member.id}
            className="flex flex-col gap-3 border border-white/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold text-white">{member.name}</p>
              <p className="text-sm text-white/55">
                {member.email} · {member.role}
                {liveByUserId.has(member.id) ? (
                  <span className="ml-2 text-green-400">· LIVE</span>
                ) : (
                  <span className="ml-2 text-white/35">· offline</span>
                )}
              </p>
            </div>
            {canManage ? (
              <form action={setStaffRoleAction} className="flex gap-2">
                <input type="hidden" name="email" value={member.email} />
                <select
                  name="role"
                  defaultValue={member.role}
                  className="border border-white/20 bg-black px-3 py-2 text-sm text-white"
                >
                  <option value="admin">admin</option>
                  <option value="reviewer">reviewer</option>
                  <option value="user">user (remove)</option>
                </select>
                <button
                  type="submit"
                  className="border border-brand-orange px-3 py-2 text-xs tracking-[0.12em] text-brand-orange"
                >
                  SAVE
                </button>
              </form>
            ) : (
              <span className="text-xs uppercase text-white/40">{member.role}</span>
            )}
          </div>
        ))}
      </section>

      {canManage ? (
        <>
          <section className="border border-white/15 p-5">
            <h2 className="font-display text-2xl text-white">Add staff member</h2>
            <p className="mt-2 text-sm text-white/60">
              They must already have a Badlands Bricks account (sign up on the
              site). Then promote them here.
            </p>
            <form
              action={setStaffRoleAction}
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px_auto]"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="builder@email.com"
                className="border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
              />
              <select
                name="role"
                defaultValue="reviewer"
                className="border border-white/20 bg-black px-3 py-2 text-white"
              >
                <option value="reviewer">reviewer</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="submit"
                className="bg-brand-orange px-4 py-2 text-xs font-bold tracking-[0.12em] text-white"
              >
                ADD
              </button>
            </form>
          </section>

          <section className="border border-white/15 p-5">
            <h2 className="font-display text-2xl text-white">
              Reset account password
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Set a temporary password for a forgotten login, then tell the
              person to change it in Account Settings.
            </p>
            <form
              action={resetUserPasswordAction}
              className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="account@email.com"
                className="border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
              />
              <input
                name="password"
                type="text"
                required
                minLength={6}
                placeholder="New temporary password"
                className="border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
              />
              <button
                type="submit"
                className="border border-brand-orange px-4 py-2 text-xs font-bold tracking-[0.12em] text-brand-orange"
              >
                RESET
              </button>
            </form>
          </section>

          <section className="border border-white/15 p-5">
            <h2 className="font-display text-2xl text-white">Delete account</h2>
            <p className="mt-2 text-sm text-white/60">
              Permanently removes the account so that email can sign up again.
            </p>
            <form
              action={deleteUserAccountAction}
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                name="email"
                type="email"
                required
                placeholder="account@email.com"
                className="flex-1 border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
              />
              <button
                type="submit"
                className="border border-red-400 px-4 py-2 text-xs font-bold tracking-[0.12em] text-red-300"
              >
                DELETE ACCOUNT
              </button>
            </form>
          </section>
        </>
      ) : (
        <p className="text-sm text-white/50">
          You are a reviewer. Ask an admin to change team roles.
        </p>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-2xl text-white">All accounts</h2>
            <p className="mt-1 text-sm text-white/50">
              {accounts.length} account{accounts.length === 1 ? "" : "s"}
              {search ? " matching search" : ""} · {liveCount} live now
              (active in the last 2 minutes)
            </p>
          </div>
          <form action="/admin/team" method="get" className="flex gap-2">
            <input
              name="q"
              defaultValue={search}
              placeholder="Search name or email"
              className="min-w-[220px] border border-white/20 bg-black px-3 py-2 text-sm text-white outline-none focus:border-brand-orange"
            />
            <button
              type="submit"
              className="border border-white/25 px-3 py-2 text-xs tracking-[0.12em] text-white hover:border-brand-orange hover:text-brand-orange"
            >
              SEARCH
            </button>
            {search ? (
              <Link
                href="/admin/team"
                className="border border-white/15 px-3 py-2 text-xs tracking-[0.12em] text-white/50 hover:text-white"
              >
                CLEAR
              </Link>
            ) : null}
          </form>
        </div>

        {sortedAccounts.length === 0 ? (
          <p className="text-sm text-white/50">No accounts found.</p>
        ) : (
          <div className="overflow-x-auto border border-white/15">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-white/10 text-xs tracking-[0.12em] text-white/45">
                <tr>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">Name</th>
                  <th className="px-4 py-3 font-normal">Email</th>
                  <th className="px-4 py-3 font-normal">Role</th>
                  <th className="px-4 py-3 font-normal">Access</th>
                  <th className="px-4 py-3 font-normal">Joined</th>
                </tr>
              </thead>
              <tbody>
                {sortedAccounts.map((user) => {
                  const live = liveByUserId.has(user.id);
                  const member =
                    user.planSubscription &&
                    PLAN_ACCESS_STATUSES.has(user.planSubscription.status);
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-white/10 text-white/75 last:border-b-0"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {live ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-green-400">
                            <span className="h-2 w-2 rounded-full bg-green-400" />
                            LIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs tracking-[0.12em] text-white/35">
                            <span className="h-2 w-2 rounded-full bg-white/25" />
                            OFFLINE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {user.name}
                      </td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3 uppercase tracking-[0.08em] text-white/60">
                        {user.role}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {member ? (
                            <span className="bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-brand-orange">
                              MEMBER
                            </span>
                          ) : null}
                          {user.foundingMemberNumber != null ? (
                            <span className="border border-white/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] text-white/70">
                              FOUNDING #{user.foundingMemberNumber}
                            </span>
                          ) : null}
                          {!member && user.foundingMemberNumber == null ? (
                            <span className="text-xs text-white/35">—</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-white/55">
                        {user.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
