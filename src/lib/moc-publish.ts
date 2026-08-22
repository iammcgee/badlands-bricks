import type { MocSubmission, Product } from "@prisma/client";
import { isRemoteMocPath } from "@/lib/moc-files";
import { parseJsonStringArray } from "@/lib/moc-review";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "moc";
}

async function uniqueProductSlug(base: string, excludeProductId?: string) {
  let slug = slugify(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeProductId) return candidate;
    attempt += 1;
  }
}

async function uniqueCreatorSlug(base: string) {
  let slug = slugify(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const existing = await prisma.creator.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    attempt += 1;
  }
}

export async function ensureCreatorForBuilder(input: {
  builderName: string;
  builderEmail: string;
}) {
  const displayName = input.builderName.trim() || "Community Builder";
  const email = input.builderEmail.trim().toLowerCase();

  // Prefer an existing creator with the same display name.
  const byName = await prisma.creator.findFirst({
    where: { displayName: { equals: displayName, mode: "insensitive" } },
  });
  if (byName) return byName;

  const slug = await uniqueCreatorSlug(displayName);
  return prisma.creator.create({
    data: {
      slug,
      displayName,
      bio: email
        ? `Community builder on Badlands Bricks (${email}).`
        : "Community builder on Badlands Bricks.",
    },
  });
}

export function shopImagesFromSubmission(submission: MocSubmission): string[] {
  return parseJsonStringArray(submission.photoPathsJson).filter(isRemoteMocPath);
}

export function shopPdfFromSubmission(submission: MocSubmission): string | null {
  const files = parseJsonStringArray(submission.instructionPathsJson);
  const pdf = files.find(
    (path) =>
      isRemoteMocPath(path) &&
      (/\.pdf($|\?)/i.test(path) || path.toLowerCase().includes("/pdf/")),
  );
  return pdf || null;
}

export async function publishApprovedMocToBuild(
  submission: MocSubmission,
  options?: { priceCents?: number },
): Promise<Product> {
  const creator = await ensureCreatorForBuilder({
    builderName: submission.builderName,
    builderEmail: submission.builderEmail,
  });

  const images = shopImagesFromSubmission(submission);
  const pdfUrl = shopPdfFromSubmission(submission);

  const existing = await prisma.product.findUnique({
    where: { mocSubmissionId: submission.id },
  });

  const priceCents =
    typeof options?.priceCents === "number" && options.priceCents >= 0
      ? Math.round(options.priceCents)
      : existing?.priceCents ?? 0;

  const description = [
    submission.theme ? `Theme: ${submission.theme}.` : "",
    "Community MOC approved by Badlands Bricks.",
    "Includes showcase photos and downloadable building instructions.",
  ]
    .filter(Boolean)
    .join(" ");

  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        name: submission.mocName,
        slug: await uniqueProductSlug(submission.mocName, existing.id),
        priceCents,
        description,
        imagesJson: JSON.stringify(images),
        youtubeUrl: submission.youtubeUrl || null,
        downloadFilePath: pdfUrl || existing.downloadFilePath,
        isActive: true,
        creatorId: creator.id,
      },
    });
  }

  return prisma.product.create({
    data: {
      name: submission.mocName,
      slug: await uniqueProductSlug(submission.mocName),
      priceCents,
      description,
      imagesJson: JSON.stringify(images),
      youtubeUrl: submission.youtubeUrl || null,
      downloadFilePath: pdfUrl,
      isActive: true,
      creatorId: creator.id,
      mocSubmissionId: submission.id,
    },
  });
}

export async function unpublishMocFromBuild(submissionId: string) {
  const existing = await prisma.product.findUnique({
    where: { mocSubmissionId: submissionId },
  });
  if (!existing) return null;
  return prisma.product.update({
    where: { id: existing.id },
    data: { isActive: false },
  });
}
