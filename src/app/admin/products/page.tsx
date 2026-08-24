import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Build Catalog" };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");

  const query = await searchParams;
  const products = await prisma.product.findMany({
    include: {
      creator: true,
      mocSubmission: {
        select: {
          id: true,
          builderName: true,
          builderEmail: true,
        },
      },
      _count: { select: { favorites: true, orderItems: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl tracking-[0.08em] text-white">
            BUILD CATALOG
          </h1>
          <p className="mt-2 text-white/60">
            Edit, hide, or remove MOCs that appear in Build — including
            community submissions after approval.
          </p>
        </div>
        <Link
          href="/admin/mocs/new"
          className="inline-block bg-brand-orange px-5 py-3 text-center text-xs font-bold tracking-[0.14em] text-white"
        >
          CREATE MOC
        </Link>
      </div>

      {query.saved ? (
        <p className="border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          Product saved.
        </p>
      ) : null}
      {query.deleted ? (
        <p className="border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          Product removed from Build.
        </p>
      ) : null}
      {query.error === "orders" ? (
        <p className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          That MOC has past orders, so it was hidden instead of permanently
          deleted. You can still edit it below.
        </p>
      ) : null}
      {query.error === "missing" ? (
        <p className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          Could not find that product.
        </p>
      ) : null}

      <div className="space-y-3">
        {products.length === 0 ? (
          <p className="text-white/50">No Build products yet.</p>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="flex flex-col gap-3 border border-white/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{product.name}</p>
                  {!product.isActive ? (
                    <span className="text-xs uppercase tracking-[0.12em] text-red-300">
                      Hidden
                    </span>
                  ) : (
                    <span className="text-xs uppercase tracking-[0.12em] text-green-400">
                      Live
                    </span>
                  )}
                  {product.includedInPlan ? (
                    <span className="text-xs uppercase tracking-[0.12em] text-brand-orange">
                      Plan
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-white/55">
                  {formatPrice(product.priceCents)} · by{" "}
                  {product.creator.displayName} · /build/{product.slug}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {product._count.favorites} like
                  {product._count.favorites === 1 ? "" : "s"} ·{" "}
                  {product._count.orderItems} order line
                  {product._count.orderItems === 1 ? "" : "s"}
                  {product.mocSubmission
                    ? ` · from MOC by ${product.mocSubmission.builderName || product.mocSubmission.builderEmail}`
                    : " · catalog / staff product"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/build/${product.slug}`}
                  className="border border-white/20 px-4 py-2 text-xs tracking-[0.12em] text-white/70 hover:border-brand-orange hover:text-brand-orange"
                >
                  VIEW
                </Link>
                <Link
                  href={`/admin/products/${product.id}`}
                  className="border border-brand-orange px-4 py-2 text-xs font-bold tracking-[0.12em] text-brand-orange"
                >
                  EDIT
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
