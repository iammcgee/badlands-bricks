import { Creator, Product } from "@prisma/client";

export type CreatorView = {
  id: string;
  slug: string;
  displayName: string;
  bio: string;
  avatarPath: string | null;
};

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  description: string;
  images: string[];
  youtubeUrl: string | null;
  downloadFilePath: string | null;
  isActive: boolean;
  includedInPlan: boolean;
  creatorId: string;
  creator?: CreatorView;
  favoriteCount?: number;
  favoritedByMe?: boolean;
};

export function parseImages(imagesJson: string): string[] {
  try {
    const parsed = JSON.parse(imagesJson) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function toCreatorView(creator: Creator): CreatorView {
  return {
    id: creator.id,
    slug: creator.slug,
    displayName: creator.displayName,
    bio: creator.bio,
    avatarPath: creator.avatarPath,
  };
}

export function toProductView(
  product: Product & { creator?: Creator; _count?: { favorites: number } },
  favoritedByMe = false,
): ProductView {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    description: product.description,
    images: parseImages(product.imagesJson),
    youtubeUrl: product.youtubeUrl ?? null,
    downloadFilePath: product.downloadFilePath,
    isActive: product.isActive,
    includedInPlan: product.includedInPlan,
    creatorId: product.creatorId,
    creator: product.creator ? toCreatorView(product.creator) : undefined,
    favoriteCount: product._count?.favorites ?? 0,
    favoritedByMe,
  };
}

export function formatPrice(priceCents: number): string {
  if (!Number.isFinite(priceCents) || priceCents <= 0) {
    return "FREE";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}
