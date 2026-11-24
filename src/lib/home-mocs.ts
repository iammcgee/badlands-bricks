import type { ProductView } from "@/lib/products";

/** Homepage default row: Badlands Brick, Bee Buggy, Max Flex. */
const FEATURED_HOME_MOCS = [
  {
    slug: "badlands-brick",
    name: /^badlands\s*bricks?$/i,
  },
  {
    slug: "bee-buggy",
    name: /^bee\s*buggy$/i,
  },
  {
    slug: "max-flex",
    name: /^max\s*flex$/i,
  },
] as const;

function matchesFeatured(
  product: Pick<ProductView, "slug" | "name">,
  featured: (typeof FEATURED_HOME_MOCS)[number],
) {
  const slug = product.slug.toLowerCase();
  if (slug === featured.slug || slug.startsWith(`${featured.slug}-`)) {
    return true;
  }
  return featured.name.test(product.name.trim());
}

export function splitHomeMocs(products: ProductView[]) {
  const used = new Set<string>();
  const featured: ProductView[] = [];

  for (const featuredMatch of FEATURED_HOME_MOCS) {
    const hit = products.find(
      (product) =>
        !used.has(product.id) && matchesFeatured(product, featuredMatch),
    );
    if (hit) {
      featured.push(hit);
      used.add(hit.id);
    }
  }

  const rest = products.filter((product) => !used.has(product.id));

  // If a named featured MOC is missing, fill the default row so the homepage
  // still shows three sharp cards instead of an empty grid.
  while (featured.length < 3 && rest.length > 0) {
    const next = rest.shift()!;
    featured.push(next);
  }

  return { featured, rest };
}
