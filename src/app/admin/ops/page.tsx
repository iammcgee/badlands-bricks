import Link from "next/link";
import { redirect } from "next/navigation";
import { assignCreatorAction } from "@/app/admin/actions";
import { getAdminAccess } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Ops" };

export default async function AdminOpsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");

  const query = await searchParams;
  const since = new Date(Date.now() - 2 * 60 * 1000);

  const [orders, contacts, products, creators, onlineCount, favoriteCount, followCount] =
    await Promise.all([
      prisma.order.findMany({
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.product.findMany({
        include: { creator: true },
        orderBy: { name: "asc" },
      }),
      prisma.creator.findMany({ orderBy: { displayName: "asc" } }),
      prisma.presenceSession.count({ where: { lastSeenAt: { gte: since } } }),
      prisma.favorite.count(),
      prisma.follow.count(),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 md:px-8">
      <div>
        <h1 className="font-display text-4xl tracking-[0.08em] text-white">
          UNDER THE HOOD
        </h1>
        <p className="mt-2 text-white/60">
          Shop ops, messages, creator assignment, and system counters.
        </p>
      </div>

      {query.saved && (
        <p className="text-sm text-brand-orange">Saved.</p>
      )}
      {query.error === "forbidden" && (
        <p className="text-sm text-red-400">Admin role required for that action.</p>
      )}

      <section id="system" className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/team"
          className="border border-white/15 px-4 py-4 transition hover:border-brand-orange"
        >
          <p className="text-xs tracking-[0.14em] text-white/50">ONLINE</p>
          <p className="mt-1 font-display text-3xl text-white">{onlineCount}</p>
          <p className="mt-2 text-xs text-white/45">See who by name → Team</p>
        </Link>
        <div className="border border-white/15 px-4 py-4">
          <p className="text-xs tracking-[0.14em] text-white/50">FAVORITES</p>
          <p className="mt-1 font-display text-3xl text-white">{favoriteCount}</p>
        </div>
        <div className="border border-white/15 px-4 py-4">
          <p className="text-xs tracking-[0.14em] text-white/50">FOLLOWS</p>
          <p className="mt-1 font-display text-3xl text-white">{followCount}</p>
        </div>
      </section>

      <section id="creators">
        <h2 className="font-display text-2xl text-white">Creators</h2>
        <div className="mt-4 space-y-2 text-sm text-white/80">
          {creators.map((creator) => (
            <div key={creator.id} className="border border-white/15 px-4 py-3">
              <span className="font-semibold text-white">{creator.displayName}</span>
              <span className="text-white/50"> · /creators/{creator.slug}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl text-white">Assign Creator to MOC</h2>
        {access.role !== "admin" ? (
          <p className="mt-3 text-sm text-white/50">Admin role required.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {products.map((product) => (
              <form
                key={product.id}
                action={assignCreatorAction}
                className="flex flex-col gap-3 border border-white/15 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <input type="hidden" name="productId" value={product.id} />
                <div>
                  <p className="font-semibold text-white">{product.name}</p>
                  <p className="text-xs text-white/50">
                    Current: {product.creator.displayName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    name="creatorId"
                    defaultValue={product.creatorId}
                    className="border border-white/20 bg-black px-3 py-2 text-sm text-white outline-none focus:border-brand-orange"
                  >
                    {creators.map((creator) => (
                      <option key={creator.id} value={creator.id}>
                        {creator.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="border border-brand-orange px-4 py-2 text-xs font-bold tracking-[0.12em] text-brand-orange"
                  >
                    SAVE
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </section>

      <section id="orders">
        <h2 className="font-display text-2xl text-white">Orders</h2>
        <div className="mt-4 space-y-3">
          {orders.length === 0 && <p className="text-white/50">No orders yet.</p>}
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
                {formatPrice(order.totalCents)} · {order.createdAt.toLocaleString()}
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

      <section id="messages">
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
