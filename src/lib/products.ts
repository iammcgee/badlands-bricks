import { Product } from "@prisma/client";

export type ProductView = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  description: string;
  images: string[];
  downloadFilePath: string | null;
  isActive: boolean;
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

export function toProductView(product: Product): ProductView {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    priceCents: product.priceCents,
    description: product.description,
    images: parseImages(product.imagesJson),
    downloadFilePath: product.downloadFilePath,
    isActive: product.isActive,
  };
}

export function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}
