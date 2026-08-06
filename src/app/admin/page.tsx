import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, getAdminPassword, isAdminAuthenticated } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") || "");
  if (password !== getAdminPassword()) {
    redirect("/admin?error=1");
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, password, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/admin");
}

async function markReviewedAction(formData: FormData) {
  "use server";
  if (!(await isAdminAuthenticated())) redirect("/admin");
  const id = String(formData.get("id") || "");
  if (id) {
    await prisma.mocSubmission.update({
      where: { id },
      data: { status: "reviewed" },
    });
  }
  redirect("/admin");
}

async function logoutAction() {
  "use server";
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin");
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const authed = await isAdminAuthenticated();

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="font-display text-4xl text-white">ADMIN</h1>
        <form action={loginAction} className="mt-8 space-y-4">
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white"
          />
          {error && (
            <p className="text-sm text-red-400">Incorrect password.</p>
          )}
          <button
            type="submit"
            className="w-full bg-brand-orange px-4 py-3 text-sm font-bold tracking-[0.14em] text-white"
          >
            LOGIN
          </button>
        </form>
      </div>
    );
  }

  const [orders, submissions, contacts] = await Promise.all([
    prisma.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.mocSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 md:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl text-white">ADMIN</h1>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-white/60 hover:text-brand-orange">
            Log out
          </button>
        </form>
      </div>

      <section>
        <h2 className="font-display text-2xl text-white">Orders</h2>
        <div className="mt-4 space-y-3">
          {orders.length === 0 && (
            <p className="text-white/50">No orders yet.</p>
          )}
          {orders.map((order) => (
            <div
              key={order.id}
              className="border border-white/15 p-4 text-sm text-white/80"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <span>{order.email}</span>
                <span className="uppercase text-brand-orange">{order.status}</span>
              </div>
              <p className="mt-1">
                {formatPrice(order.totalCents)} ·{" "}
                {order.createdAt.toLocaleString()}
              </p>
              <p className="mt-2 text-white/60">
                {order.items
                  .map((item) => `${item.product.name} × ${item.quantity}`)
                  .join(", ")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-white">MOC Submissions</h2>
        <div className="mt-4 space-y-3">
          {submissions.length === 0 && (
            <p className="text-white/50">No submissions yet.</p>
          )}
          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="border border-white/15 p-4 text-sm text-white/80"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-white">
                  {submission.mocName}
                </span>
                <span className="uppercase">{submission.status}</span>
              </div>
              <p className="mt-1">Theme: {submission.theme}</p>
              {submission.notes && <p className="mt-1">Notes: {submission.notes}</p>}
              <p className="mt-1 text-white/50">
                {submission.createdAt.toLocaleString()}
              </p>
              {submission.status === "new" && (
                <form action={markReviewedAction} className="mt-3">
                  <input type="hidden" name="id" value={submission.id} />
                  <button
                    type="submit"
                    className="border border-brand-orange px-3 py-1 text-xs tracking-[0.12em] text-brand-orange"
                  >
                    MARK REVIEWED
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-white">Contact Messages</h2>
        <div className="mt-4 space-y-3">
          {contacts.length === 0 && (
            <p className="text-white/50">No messages yet.</p>
          )}
          {contacts.map((message) => (
            <div
              key={message.id}
              className="border border-white/15 p-4 text-sm text-white/80"
            >
              <p className="font-semibold text-white">
                {message.name} · {message.email}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{message.message}</p>
              <p className="mt-2 text-white/50">
                {message.createdAt.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
