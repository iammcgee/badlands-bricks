import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin";
import { parseJsonStringArray } from "@/lib/moc-review";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  photoUrls: z.array(z.string().url()).min(1).optional(),
  pdfUrl: z.string().url().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminAccess("reviewer");
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid media payload" }, { status: 400 });
  }

  const { photoUrls, pdfUrl } = parsed.data;
  if (!photoUrls?.length && !pdfUrl) {
    return NextResponse.json(
      { error: "Upload new photos and/or a new instructions PDF" },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      mocSubmission: {
        select: {
          id: true,
          photoPathsJson: true,
          instructionPathsJson: true,
        },
      },
    },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.product.update({
    where: { id: product.id },
    data: {
      ...(photoUrls?.length
        ? { imagesJson: JSON.stringify(photoUrls) }
        : {}),
      ...(pdfUrl ? { downloadFilePath: pdfUrl } : {}),
    },
  });

  if (product.mocSubmission) {
    const submissionData: {
      photoPathsJson?: string;
      instructionPathsJson?: string;
    } = {};

    if (photoUrls?.length) {
      submissionData.photoPathsJson = JSON.stringify(photoUrls);
    }

    if (pdfUrl) {
      const existing = parseJsonStringArray(
        product.mocSubmission.instructionPathsJson,
      );
      const withoutOldPdf = existing.filter(
        (path) =>
          !/\.pdf($|\?)/i.test(path) && !path.toLowerCase().includes("/pdf/"),
      );
      submissionData.instructionPathsJson = JSON.stringify([
        ...withoutOldPdf,
        pdfUrl,
      ]);
    }

    if (Object.keys(submissionData).length > 0) {
      await prisma.mocSubmission.update({
        where: { id: product.mocSubmission.id },
        data: submissionData,
      });
      revalidatePath(`/admin/mocs/${product.mocSubmission.id}`);
    }
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${product.id}`);
  revalidatePath("/build");
  revalidatePath(`/build/${product.slug}`);
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
