import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin";
import { persistMocUploads } from "@/lib/moc-files";
import { MOC_STATUSES } from "@/lib/moc-review";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const access = await getAdminAccess();
    if (!access) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const mocName = String(form.get("mocName") || "").trim();
    const theme = String(form.get("theme") || "").trim();
    const notes = String(form.get("notes") || "").trim();
    const statusRaw = String(form.get("status") || "approved").trim();
    const status = MOC_STATUSES.includes(
      statusRaw as (typeof MOC_STATUSES)[number],
    )
      ? statusRaw
      : "approved";

    if (!mocName || !theme) {
      return NextResponse.json(
        { error: "MOC name and theme are required" },
        { status: 400 },
      );
    }

    const builderName = access.label || "Badlands Staff";
    const builderEmail = (
      access.email ||
      process.env.CONTACT_TO_EMAIL ||
      "info@badlandsbricks.com"
    ).toLowerCase();

    const uploaded = await persistMocUploads(form);
    if ("error" in uploaded) {
      return NextResponse.json({ error: uploaded.error }, { status: 400 });
    }

    const { photoPaths, instructionPaths, pdfPaths } = uploaded;
    const now = new Date();
    const isReviewed = status !== "new";

    const submission = await prisma.mocSubmission.create({
      data: {
        mocName,
        theme,
        builderName,
        builderEmail,
        submitterUserId: access.userId ?? null,
        notes: notes || null,
        photoPathsJson: JSON.stringify(photoPaths),
        instructionPathsJson: JSON.stringify([
          ...instructionPaths,
          ...pdfPaths,
        ]),
        status,
        reviewedAt: isReviewed ? now : null,
        reviewedByUserId: isReviewed ? access.userId ?? null : null,
        reviewNotes: {
          create: {
            authorUserId: access.userId ?? null,
            authorLabel: access.label,
            body: "Created directly in the admin portal (staff upload).",
            decision: status === "new" ? "note" : status,
            emailed: false,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, id: submission.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
