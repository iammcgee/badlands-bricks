import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toProductView } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/favorites");
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        include: {
          creator: true,
          _count: { select: { favorites: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = favorites
    .filter((row) => row.product.isActive)
    .map((row) => toProductView(row.product, true));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
        YOUR FAVORITES
      </h1>
      <p className="mt-3 text-white/70">MOCs you liked with the heart button.</p>

      {products.length === 0 ? (
        <div className="mt-10 text-white/60">
          <p>No favorites yet.</p>
          <Link href="/build" className="mt-4 inline-block text-brand-orange">
            Browse builds
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
