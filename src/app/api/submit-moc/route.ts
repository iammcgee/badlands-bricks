import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendNotificationEmail } from "@/lib/email";
import { persistMocUploads } from "@/lib/moc-files";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json(
        { error: "Log in to submit a MOC" },
        { status: 401 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    });
    if (!user?.email) {
      return NextResponse.json(
        { error: "Log in to submit a MOC" },
        { status: 401 },
      );
    }

    const form = await request.formData();
    const mocName = String(form.get("mocName") || "").trim();
    const theme = String(form.get("theme") || "").trim();
    const notes = String(form.get("notes") || "").trim();
    const builderName = user.name?.trim() || user.email.split("@")[0];
    const builderEmail = user.email.toLowerCase();

    if (!mocName || !theme) {
      return NextResponse.json(
        { error: "MOC name and theme are required" },
        { status: 400 },
      );
    }

    const uploaded = await persistMocUploads(form);
    if ("error" in uploaded) {
      return NextResponse.json({ error: uploaded.error }, { status: 400 });
    }

    const { photoPaths, instructionPaths, pdfPaths, instructionCount } =
      uploaded;

    const submission = await prisma.mocSubmission.create({
      data: {
        mocName,
        theme,
        builderName,
        builderEmail,
        submitterUserId: user.id,
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
      text: `Builder: ${builderName} <${builderEmail}>\nTheme: ${theme}\nNotes: ${notes || "(none)"}\nPhotos: ${photoPaths.length}\nInstruction steps: ${instructionCount}\nPDF: ${pdfPaths[0] || "(none)"}\nSubmission ID: ${submission.id}\nReview: /admin/mocs/${submission.id}`,
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
