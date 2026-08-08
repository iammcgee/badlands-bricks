import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { persistMocUploads } from "@/lib/moc-files";
import {
  createUserMocSubmission,
  parseUrlList,
} from "@/lib/moc-submit";
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

    const builderName = user.name?.trim() || user.email.split("@")[0];
    const builderEmail = user.email.toLowerCase();
    const contentType = request.headers.get("content-type") || "";

    let mocName = "";
    let theme = "";
    let notes = "";
    let photoPaths: string[] = [];
    let instructionPaths: string[] = [];
    let pdfPaths: string[] = [];
    let instructionCount = 0;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        mocName?: string;
        theme?: string;
        notes?: string;
        photoUrls?: unknown;
        instructionUrls?: unknown;
        pdfUrl?: string | null;
      };
      mocName = String(body.mocName || "").trim();
      theme = String(body.theme || "").trim();
      notes = String(body.notes || "").trim();
      photoPaths = parseUrlList(body.photoUrls);
      instructionPaths = parseUrlList(body.instructionUrls);
      const pdfUrl =
        typeof body.pdfUrl === "string" && /^https?:\/\//i.test(body.pdfUrl)
          ? body.pdfUrl
          : null;
      pdfPaths = pdfUrl ? [pdfUrl] : [];
      instructionCount = instructionPaths.length;

      if (photoPaths.length === 0 || instructionPaths.length === 0) {
        return NextResponse.json(
          { error: "Please upload MOC photos and instruction step images" },
          { status: 400 },
        );
      }
    } else {
      const form = await request.formData();
      mocName = String(form.get("mocName") || "").trim();
      theme = String(form.get("theme") || "").trim();
      notes = String(form.get("notes") || "").trim();

      const uploaded = await persistMocUploads(form);
      if ("error" in uploaded) {
        return NextResponse.json({ error: uploaded.error }, { status: 400 });
      }
      photoPaths = uploaded.photoPaths;
      instructionPaths = uploaded.instructionPaths;
      pdfPaths = uploaded.pdfPaths;
      instructionCount = uploaded.instructionCount;
    }

    if (!mocName || !theme) {
      return NextResponse.json(
        { error: "MOC name and theme are required" },
        { status: 400 },
      );
    }

    const submission = await createUserMocSubmission({
      userId: user.id,
      builderName,
      builderEmail,
      mocName,
      theme,
      notes,
      photoPaths,
      instructionPaths,
      pdfPaths,
      instructionCount,
    });

    return NextResponse.json({ ok: true, id: submission.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }
}
