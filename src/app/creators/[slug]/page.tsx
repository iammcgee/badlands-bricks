import Link from "next/link";
import { notFound } from "next/navigation";
import { FollowButton } from "@/components/FollowButton";
import { ProductCard } from "@/components/ProductCard";
import { auth } from "@/lib/auth";
import { userHasPlanAccess } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { toProductView } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const creator = await prisma.creator.findUnique({ where: { slug } });
  return { title: creator?.displayName || "Creator" };
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const creator = await prisma.creator.findUnique({
    where: { slug },
    include: {
      _count: { select: { followers: true } },
      products: {
        where: { isActive: true },
        include: {
          creator: true,
          _count: { select: { favorites: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!creator) notFound();

  const favoritedIds = session?.user?.id
    ? new Set(
        (
          await prisma.favorite.findMany({
            where: {
              userId: session.user.id,
              productId: { in: creator.products.map((p) => p.id) },
            },
            select: { productId: true },
          })
        ).map((row) => row.productId),
      )
    : new Set<string>();

  const following = session?.user?.id
    ? Boolean(
        await prisma.follow.findUnique({
          where: {
            followerUserId_creatorId: {
              followerUserId: session.user.id,
              creatorId: creator.id,
            },
          },
        }),
      )
    : false;

  const hasPlanAccess = session?.user?.id
    ? await userHasPlanAccess(session.user.id)
    : false;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={creator.avatarPath || "/brand/logo.png"}
            alt={creator.displayName}
            className="h-20 w-20 rounded-full object-contain"
          />
          <div>
            <h1 className="font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
              {creator.displayName.toUpperCase()}
            </h1>
            <p className="mt-3 max-w-2xl text-white/70">{creator.bio}</p>
            <p className="mt-2 text-sm text-white/50">
              <Link href="/build" className="hover:text-brand-orange">
                ← Back to builds
              </Link>
            </p>
          </div>
        </div>
        <FollowButton
          creatorId={creator.id}
          initialFollowing={following}
          initialCount={creator._count.followers}
        />
      </div>

      <h2 className="mt-12 font-display text-3xl tracking-[0.08em] text-white">
        MOCS
      </h2>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {creator.products.map((product) => (
          <ProductCard
            key={product.id}
            product={toProductView(product, favoritedIds.has(product.id))}
            hasPlanAccess={hasPlanAccess}
          />
        ))}
      </div>
    </div>
  );
}
