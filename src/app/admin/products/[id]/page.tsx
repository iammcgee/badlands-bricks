import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  deleteProductAction,
  updateProductAction,
} from "@/app/admin/actions";
import { getAdminAccess } from "@/lib/admin";
import { parseImages } from "@/lib/products";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  return { title: product ? `Edit ${product.name}` : "Edit Product" };
}

export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");

  const { id } = await params;
  const query = await searchParams;

  const [product, creators] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        creator: true,
        mocSubmission: {
          select: {
            id: true,
            mocName: true,
            builderName: true,
            builderEmail: true,
            status: true,
          },
        },
        _count: { select: { orderItems: true, favorites: true } },
      },
    }),
    prisma.creator.findMany({ orderBy: { displayName: "asc" } }),
  ]);

  if (!product) notFound();

  const images = parseImages(product.imagesJson);
  const priceUsd = (product.priceCents / 100).toFixed(2);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8">
      <div>
        <Link
          href="/admin/products"
          className="text-xs text-white/50 hover:text-brand-orange"
        >
          ← BACK TO BUILD CATALOG
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-[0.08em] text-white">
          EDIT MOC
        </h1>
        <p className="mt-2 text-white/60">
          Change what shoppers see in Build, hide it, or remove it entirely.
        </p>
      </div>

      {query.error === "invalid" ? (
        <p className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          Check the name, price, and slug, then try again.
        </p>
      ) : null}
      {query.error === "slug" ? (
        <p className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          That URL slug is already used by another product.
        </p>
      ) : null}
      {query.error === "youtube" ? (
        <p className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          That doesn&apos;t look like a valid YouTube link. Paste a watch or
          youtu.be URL, or leave it blank.
        </p>
      ) : null}
      {query.error === "membership" ? (
        <p className="border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          This community builder doesn&apos;t have an active Badlands Plan, so
          their MOC can&apos;t be listed for a paid price. Keep it free, or ask
          them to join membership to sell.
        </p>
      ) : null}

      {product.mocSubmission ? (
        <p className="border border-white/15 px-4 py-3 text-sm text-white/70">
          Linked submission:{" "}
          <Link
            href={`/admin/mocs/${product.mocSubmission.id}`}
            className="text-brand-orange hover:underline"
          >
            {product.mocSubmission.mocName}
          </Link>{" "}
          · {product.mocSubmission.builderName || "builder"} ·{" "}
          {product.mocSubmission.status}
        </p>
      ) : null}

      <form action={updateProductAction} className="space-y-4 border border-white/15 p-5">
        <input type="hidden" name="id" value={product.id} />
        <label className="block space-y-2 text-sm">
          <span className="text-white/70">Name</span>
          <input
            name="name"
            required
            defaultValue={product.name}
            className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/70">URL slug</span>
          <input
            name="slug"
            required
            defaultValue={product.slug}
            className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
          />
          <span className="block text-xs text-white/45">
            Appears as /build/{product.slug}
          </span>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/70">Price (USD)</span>
          <input
            type="number"
            name="priceUsd"
            min="0"
            step="0.01"
            required
            defaultValue={priceUsd}
            className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/70">Description</span>
          <textarea
            name="description"
            required
            rows={5}
            defaultValue={product.description}
            className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/70">YouTube video link (optional)</span>
          <input
            name="youtubeUrl"
            type="url"
            defaultValue={product.youtubeUrl || ""}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
          />
          <span className="block text-xs text-white/45">
            Paste a YouTube link to embed the video on the Build page.
          </span>
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-white/70">Creator</span>
          <select
            name="creatorId"
            defaultValue={product.creatorId}
            className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
          >
            {creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={product.isActive}
          />
          Show in Build (uncheck to hide without deleting)
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            name="includedInPlan"
            defaultChecked={product.includedInPlan}
          />
          Include in membership (MEMBERS ONLY — not sold individually)
        </label>

        {images.length > 0 ? (
          <div>
            <p className="mb-2 text-sm text-white/50">Current photos</p>
            <div className="grid grid-cols-3 gap-2">
              {images.slice(0, 6).map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-[4/3] w-full object-cover bg-neutral-900"
                />
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-xs text-white/40">
          {product._count.favorites} like
          {product._count.favorites === 1 ? "" : "s"} ·{" "}
          {product._count.orderItems} order line
          {product._count.orderItems === 1 ? "" : "s"}
        </p>

        <button
          type="submit"
          className="bg-brand-orange px-5 py-3 text-sm font-bold tracking-[0.14em] text-white"
        >
          SAVE CHANGES
        </button>
      </form>

      <form
        action={deleteProductAction}
        className="space-y-3 border border-red-400/30 p-5"
      >
        <input type="hidden" name="id" value={product.id} />
        <h2 className="font-display text-2xl text-white">Remove from Build</h2>
        <p className="text-sm text-white/60">
          Permanently deletes this catalog entry when it has no orders. If it
          already has orders, it will be hidden instead so purchase history
          stays intact.
        </p>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" name="confirm" required />
          Yes, remove this MOC from Build
        </label>
        <button
          type="submit"
          className="border border-red-400 px-5 py-3 text-sm font-bold tracking-[0.14em] text-red-300"
        >
          DELETE / HIDE MOC
        </button>
      </form>
    </div>
  );
}
