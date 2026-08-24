import { ProductCard } from "@/components/ProductCard";
import { auth } from "@/lib/auth";
import { userHasPlanAccess } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { toProductView } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "BUILD" };

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q || "").trim();
  const session = await auth();

  const records = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      creator: true,
      _count: { select: { favorites: true } },
    },
    orderBy: { name: "asc" },
  });

  const favoritedIds = session?.user?.id
    ? new Set(
        (
          await prisma.favorite.findMany({
            where: {
              userId: session.user.id,
              productId: { in: records.map((p) => p.id) },
            },
            select: { productId: true },
          })
        ).map((row) => row.productId),
      )
    : new Set<string>();

  const hasPlanAccess = session?.user?.id
    ? await userHasPlanAccess(session.user.id)
    : false;

  const products = records.map((product) =>
    toProductView(product, favoritedIds.has(product.id)),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-5xl tracking-[0.1em] text-white md:text-6xl">
          OUR BUILDS
        </h1>
        <p className="mt-4 text-white/75">
          Ready for your next big brick adventure? Look at our cool custom
          designs! Pick your favorite, grab the pieces, and start building.
        </p>
        <form className="mt-8" action="/build" method="get">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search"
            className="w-full border border-white/40 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/50 focus:border-brand-orange"
          />
        </form>
      </div>

      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            hasPlanAccess={hasPlanAccess}
          />
        ))}
      </div>

      {products.length === 0 && (
        <p className="mt-10 text-center text-white/60">
          No results match your search. Try removing a few filters.
        </p>
      )}
    </div>
  );
}
