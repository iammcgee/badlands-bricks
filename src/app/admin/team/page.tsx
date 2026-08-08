import { redirect } from "next/navigation";
import {
  deleteUserAccountAction,
  resetUserPasswordAction,
  setStaffRoleAction,
} from "@/app/admin/actions";
import { getAdminAccess } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Team" };

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    passwordReset?: string;
    deleted?: string;
  }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");

  const query = await searchParams;
  const [staff, recentUsers] = await Promise.all([
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
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  const canManage = access.role === "admin";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
      <div>
        <h1 className="font-display text-4xl tracking-[0.08em] text-white">
          TEAM
        </h1>
        <p className="mt-2 text-white/60">
          Add reviewers/admins, reset passwords, or remove accounts.
        </p>
      </div>

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

          <section className="space-y-3">
            <h2 className="font-display text-2xl text-white">Recent accounts</h2>
            {recentUsers.map((user) => (
              <div
                key={user.id}
                className="border border-white/15 px-4 py-3 text-sm text-white/75"
              >
                <span className="font-semibold text-white">{user.name}</span>
                <span className="text-white/50">
                  {" "}
                  · {user.email} · {user.role} ·{" "}
                  {user.createdAt.toLocaleDateString()}
                </span>
              </div>
            ))}
          </section>
        </>
      ) : (
        <p className="text-sm text-white/50">
          You are a reviewer. Ask an admin to change team roles.
        </p>
      )}
    </div>
  );
}
