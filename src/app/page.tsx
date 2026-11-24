import { HomeHeroBanner } from "@/components/HomeHeroBanner";
import { HomeMocsSection } from "@/components/HomeMocsSection";
import { auth } from "@/lib/auth";
import { splitHomeMocs } from "@/lib/home-mocs";
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
      _count: { select: { favorites: true, comments: true } },
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
  const { featured, rest } = splitHomeMocs(views);

  return (
    <div>
      <HomeHeroBanner marquee={marquee} />
      <HomeMocsSection
        featured={featured}
        rest={rest}
        hasPlanAccess={hasPlanAccess}
      />
    </div>
  );
}
