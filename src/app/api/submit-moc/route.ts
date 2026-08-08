import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function saveFiles(files: File[], folder: string) {
  const paths: string[] = [];
  await mkdir(folder, { recursive: true });

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeName}`;
    const absolute = join(folder, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(absolute, bytes);
    paths.push(absolute.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", ""));
  }

  return paths;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const form = await request.formData();
    const mocName = String(form.get("mocName") || "").trim();
    const theme = String(form.get("theme") || "").trim();
    const builderName = String(form.get("builderName") || "").trim();
    const builderEmail = String(form.get("builderEmail") || "")
      .trim()
      .toLowerCase();
    const notes = String(form.get("notes") || "").trim();

    if (!mocName || !theme || !builderName || !builderEmail) {
      return NextResponse.json(
        { error: "MOC name, theme, builder name, and email are required" },
        { status: 400 },
      );
    }

    const photos = form.getAll("photos").filter((f): f is File => f instanceof File);
    const instructions = form
      .getAll("instructions")
      .filter((f): f is File => f instanceof File);
    const instructionPdf = form.get("instructionPdf");
    const pdfFile =
      instructionPdf instanceof File && instructionPdf.size > 0
        ? instructionPdf
        : null;

    if (photos.length === 0 || instructions.length === 0) {
      return NextResponse.json(
        { error: "Please upload MOC photos and instruction step images" },
        { status: 400 },
      );
    }

    let submitterUserId = session?.user?.id ?? null;
    if (!submitterUserId) {
      const matched = await prisma.user.findUnique({
        where: { email: builderEmail },
        select: { id: true },
      });
      submitterUserId = matched?.id ?? null;
    }

    const base = join(process.cwd(), "uploads", "moc-submissions", Date.now().toString());
    const photoPaths = await saveFiles(photos, join(base, "photos"));
    const instructionPaths = await saveFiles(
      instructions,
      join(base, "instructions"),
    );
    const pdfPaths = pdfFile
      ? await saveFiles([pdfFile], join(base, "pdf"))
      : [];

    const submission = await prisma.mocSubmission.create({
      data: {
        mocName,
        theme,
        builderName,
        builderEmail,
        submitterUserId,
        notes: notes || null,
        photoPathsJson: JSON.stringify(photoPaths),
        instructionPathsJson: JSON.stringify([
          ...instructionPaths,
          ...pdfPaths,
        ]),
        status: "new",
      },
    });

    await sendNotificationEmail({
      subject: `New MOC submission: ${mocName}`,
      text: `Builder: ${builderName} <${builderEmail}>\nTheme: ${theme}\nNotes: ${notes || "(none)"}\nPhotos: ${photoPaths.length}\nInstruction steps: ${instructionPaths.length}\nPDF: ${pdfPaths[0] || "(none)"}\nSubmission ID: ${submission.id}\nReview: /admin/mocs/${submission.id}`,
    });

    await sendNotificationEmail({
      to: builderEmail,
      subject: `We got your MOC: ${mocName}`,
      text: [
        `Hi ${builderName},`,
        "",
        `Thanks for submitting "${mocName}" to Badlands Bricks.`,
        "Status: Pending review",
        "",
        "Track it anytime here:",
        `${process.env.NEXT_PUBLIC_SITE_URL || "https://badlandsbricks.com"}/my-mocs`,
        "",
        "We'll update you when it's approved, needs changes, or denied.",
        "",
        "— Badlands Bricks",
      ].join("\n"),
    });

    return NextResponse.json({ ok: true, id: submission.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
