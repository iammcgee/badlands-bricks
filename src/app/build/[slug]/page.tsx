import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/FavoriteButton";
import { MembersOnlyBadge } from "@/components/MembersOnlyBadge";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductPurchasePanel } from "@/components/ProductPurchasePanel";
import { YoutubeEmbed } from "@/components/YoutubeEmbed";
import { auth } from "@/lib/auth";
import { getPlanPriceLabel, userHasPlanAccess } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { formatPrice, toProductView } from "@/lib/products";
import { youtubeEmbedUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  return { title: product?.name || "Build" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const record = await prisma.product.findUnique({
    where: { slug },
    include: {
      creator: true,
      _count: { select: { favorites: true } },
    },
  });
  if (!record || !record.isActive) notFound();

  const favoritedByMe = session?.user?.id
    ? Boolean(
        await prisma.favorite.findUnique({
          where: {
            userId_productId: {
              userId: session.user.id,
              productId: record.id,
            },
          },
        }),
      )
    : false;

  const hasPlanAccess = session?.user?.id
    ? await userHasPlanAccess(session.user.id)
    : false;

  const product = toProductView(record, favoritedByMe);
  const embedUrl = youtubeEmbedUrl(product.youtubeUrl);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="mb-6 text-xs tracking-[0.14em] text-white/60">
        <Link href="/build" className="hover:text-brand-orange">
          BUILD
        </Link>{" "}
        › {product.name}
      </p>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <ProductGallery images={product.images} name={product.name} />
          {embedUrl ? (
            <section className="space-y-3">
              <h2 className="font-display text-2xl tracking-[0.06em] text-white">
                WATCH THE BUILD
              </h2>
              <YoutubeEmbed url={embedUrl} title={`${product.name} video`} />
              {product.youtubeUrl ? (
                <p className="text-xs text-white/45">
                  <a
                    href={product.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-orange hover:underline"
                  >
                    Open on YouTube
                  </a>
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
        <div>
          <h1 className="font-display text-5xl tracking-[0.08em] text-white md:text-6xl">
            {product.name.toUpperCase()}
          </h1>
          {product.creator && (
            <p className="mt-2 text-sm tracking-[0.1em] text-white/60">
              BY{" "}
              <Link
                href={`/creators/${product.creator.slug}`}
                className="text-brand-orange hover:underline"
              >
                {product.creator.displayName.toUpperCase()}
              </Link>
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {product.includedInPlan ? (
              <>
                <MembersOnlyBadge unlocked={hasPlanAccess} />
                <p className="text-sm tracking-[0.1em] text-white/60">
                  {hasPlanAccess
                    ? "Included with your membership"
                    : `${getPlanPriceLabel()} membership`}
                </p>
              </>
            ) : (
              <p className="text-xl text-white/90">
                {formatPrice(product.priceCents)}
              </p>
            )}
          </div>
          <p className="mt-6 max-w-xl leading-relaxed text-white/75">
            {product.description}
          </p>
          <ProductPurchasePanel
            product={product}
            planPriceLabel={getPlanPriceLabel()}
            hasPlanAccess={hasPlanAccess}
            signedIn={Boolean(session?.user)}
          />
          <div className="mt-3 max-w-md">
            <FavoriteButton
              productId={product.id}
              initialFavorited={Boolean(product.favoritedByMe)}
              initialCount={product.favoriteCount ?? 0}
            />
          </div>
          <p className="mt-4 text-xs text-white/45">
            {product.includedInPlan
              ? "Members-only instructions — delivered exclusively through the Badlands Plan."
              : "Digital building instructions delivered after checkout."}
          </p>
        </div>
      </div>
    </div>
  );
}
