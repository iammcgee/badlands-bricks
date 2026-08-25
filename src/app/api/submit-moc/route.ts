import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { persistMocUploads } from "@/lib/moc-files";
import {
  createUserMocSubmission,
  parseUrlList,
} from "@/lib/moc-submit";
import { canUserSellMocs } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { isValidYoutubeUrl, normalizeYoutubeUrl } from "@/lib/youtube";

export const runtime = "nodejs";

function parseRequestedPriceCents(raw: unknown): number {
  if (raw == null || raw === "") return 0;
  const usd = Number.parseFloat(String(raw));
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd * 100);
}

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
    const canSell = await canUserSellMocs(user.id);

    let mocName = "";
    let theme = "";
    let notes = "";
    let youtubeRaw = "";
    let requestedPriceCents = 0;
    let photoPaths: string[] = [];
    let instructionPaths: string[] = [];
    let pdfPaths: string[] = [];
    let instructionCount = 0;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        mocName?: string;
        theme?: string;
        notes?: string;
        youtubeUrl?: string;
        priceUsd?: string | number;
        photoUrls?: unknown;
        instructionUrls?: unknown;
        pdfUrl?: string | null;
      };
      mocName = String(body.mocName || "").trim();
      theme = String(body.theme || "").trim();
      notes = String(body.notes || "").trim();
      youtubeRaw = String(body.youtubeUrl || "").trim();
      requestedPriceCents = parseRequestedPriceCents(body.priceUsd);
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
      youtubeRaw = String(form.get("youtubeUrl") || "").trim();
      requestedPriceCents = parseRequestedPriceCents(form.get("priceUsd"));

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

    if (!isValidYoutubeUrl(youtubeRaw)) {
      return NextResponse.json(
        { error: "Please paste a valid YouTube link (or leave it blank)" },
        { status: 400 },
      );
    }

    if (requestedPriceCents > 0 && !canSell) {
      return NextResponse.json(
        {
          error:
            "Selling MOCs requires an active Badlands Plan membership. Upload for free, or join membership to set a price.",
        },
        { status: 403 },
      );
    }

    const submission = await createUserMocSubmission({
      userId: user.id,
      builderName,
      builderEmail,
      mocName,
      theme,
      notes,
      youtubeUrl: normalizeYoutubeUrl(youtubeRaw),
      requestedPriceCents: canSell ? requestedPriceCents : 0,
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
