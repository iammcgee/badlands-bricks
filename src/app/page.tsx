import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { auth } from "@/lib/auth";
import { userHasPlanAccess } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { toProductView } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      creator: true,
      _count: { select: { favorites: true } },
    },
    orderBy: { name: "asc" },
  });

  const favoriteIds = session?.user?.id
    ? new Set(
        (
          await prisma.favorite.findMany({
            where: {
              userId: session.user.id,
              productId: { in: products.map((p) => p.id) },
            },
            select: { productId: true },
          })
        ).map((f) => f.productId),
      )
    : new Set<string>();

  const views = products.map((product) =>
    toProductView(product, favoriteIds.has(product.id)),
  );

  const hasPlanAccess = session?.user?.id
    ? await userHasPlanAccess(session.user.id)
    : false;

  const marquee =
    "DISCOVER CUSTOM LEGO® MOCS & UNIQUE BUILDING INSTRUCTIONS. ";

  return (
    <div>
      <section className="relative min-h-[78vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/products/max-flex-3.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black" />

        <div className="relative flex min-h-[78vh] flex-col items-center justify-center px-4 text-center">
          <Link
            href="/build"
            className="bg-brand-orange/90 px-10 py-5 font-display text-4xl tracking-[0.08em] text-white shadow-lg transition hover:bg-brand-orange md:text-6xl"
          >
            BUILD NOW
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 w-full overflow-hidden border-y border-white/10 bg-black/40 py-3">
          <div className="animate-marquee flex w-max whitespace-nowrap font-display text-3xl tracking-[0.06em] text-white md:text-5xl">
            <span>{marquee.repeat(4)}</span>
            <span>{marquee.repeat(4)}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <h2 className="text-center font-display text-5xl tracking-[0.1em] text-white md:text-6xl">
          MOCS
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {views.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              hasPlanAccess={hasPlanAccess}
            />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/build"
            className="inline-block border border-white px-8 py-3 text-sm font-bold tracking-[0.16em] text-white transition hover:border-brand-orange hover:text-brand-orange"
          >
            SHOP ALL MOCS
          </Link>
        </div>
      </section>
    </div>
  );
}
