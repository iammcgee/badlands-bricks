import Link from "next/link";
import { redirect } from "next/navigation";
import {
  markAdminNotificationReadAction,
  markAllAdminNotificationsReadAction,
} from "@/app/admin/actions";
import { getAdminAccess } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Notifications" };

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cleared?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");

  const query = await searchParams;
  const [unreadCount, notifications] = await Promise.all([
    prisma.adminNotification.count({ where: { readAt: null } }),
    prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-[0.08em] text-white">
            NOTIFICATIONS
          </h1>
          <p className="mt-2 text-white/60">
            New signups and other admin alerts.{" "}
            {unreadCount > 0
              ? `${unreadCount} unread.`
              : "You're all caught up."}
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllAdminNotificationsReadAction}>
            <button
              type="submit"
              className="border border-brand-orange px-4 py-2 text-xs font-bold tracking-[0.12em] text-brand-orange"
            >
              MARK ALL READ
            </button>
          </form>
        ) : null}
      </div>

      {query.cleared ? (
        <p className="text-sm text-brand-orange">All notifications marked read.</p>
      ) : null}

      {notifications.length === 0 ? (
        <p className="text-sm text-white/50">
          No notifications yet. When someone signs up, it will show here.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 border border-white/15">
          {notifications.map((item) => {
            const unread = !item.readAt;
            return (
              <li
                key={item.id}
                className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${
                  unread ? "bg-brand-orange/5" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {unread ? (
                      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand-orange" />
                    ) : null}
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-white/60">{item.body}</p>
                  <p className="mt-2 text-xs tracking-[0.1em] text-white/40">
                    {item.createdAt.toLocaleString()}
                    {item.type === "new_user" ? " · NEW ACCOUNT" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="border border-white/20 px-3 py-2 text-xs tracking-[0.12em] text-white/70 hover:border-brand-orange hover:text-brand-orange"
                    >
                      {item.type === "new_user" ? "VIEW TEAM" : "OPEN"}
                    </Link>
                  ) : null}
                  {unread ? (
                    <form action={markAdminNotificationReadAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="border border-brand-orange px-3 py-2 text-xs tracking-[0.12em] text-brand-orange"
                      >
                        MARK READ
                      </button>
                    </form>
                  ) : (
                    <span className="px-3 py-2 text-xs tracking-[0.12em] text-white/35">
                      READ
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
