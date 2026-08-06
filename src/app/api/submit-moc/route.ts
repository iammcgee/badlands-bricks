import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
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
    const form = await request.formData();
    const mocName = String(form.get("mocName") || "").trim();
    const theme = String(form.get("theme") || "").trim();
    const notes = String(form.get("notes") || "").trim();

    if (!mocName || !theme) {
      return NextResponse.json(
        { error: "MOC name and theme are required" },
        { status: 400 },
      );
    }

    const photos = form.getAll("photos").filter((f): f is File => f instanceof File);
    const instructions = form
      .getAll("instructions")
      .filter((f): f is File => f instanceof File);

    if (photos.length === 0 || instructions.length === 0) {
      return NextResponse.json(
        { error: "Please upload MOC photos and instruction files" },
        { status: 400 },
      );
    }

    const base = join(process.cwd(), "uploads", "moc-submissions", Date.now().toString());
    const photoPaths = await saveFiles(photos, join(base, "photos"));
    const instructionPaths = await saveFiles(
      instructions,
      join(base, "instructions"),
    );

    const submission = await prisma.mocSubmission.create({
      data: {
        mocName,
        theme,
        notes: notes || null,
        photoPathsJson: JSON.stringify(photoPaths),
        instructionPathsJson: JSON.stringify(instructionPaths),
        status: "new",
      },
    });

    await sendNotificationEmail({
      subject: `New MOC submission: ${mocName}`,
      text: `Theme: ${theme}\nNotes: ${notes || "(none)"}\nSubmission ID: ${submission.id}`,
    });

    return NextResponse.json({ ok: true, id: submission.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
