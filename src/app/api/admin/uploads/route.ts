import { existsSync, statSync } from "fs";
import { readFile } from "fs/promises";
import { normalize, resolve } from "path";
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin";
import { isRemoteMocPath } from "@/lib/moc-files";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await getAdminAccess();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const relative = url.searchParams.get("path") || "";
  if (!relative || relative.includes("\0")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Blob / remote URLs are stored directly on the submission.
  if (isRemoteMocPath(relative)) {
    return NextResponse.redirect(relative);
  }

  const uploadsRoots = [
    resolve(process.cwd(), "uploads"),
    resolve("/tmp", "badlands-uploads"),
  ];
  const absolute = relative.startsWith("/")
    ? resolve(normalize(relative))
    : resolve(process.cwd(), normalize(relative));

  const allowed = uploadsRoots.some(
    (root) => absolute === root || absolute.startsWith(root + "/"),
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }
  if (!existsSync(absolute) || !statSync(absolute).isFile()) {
    return NextResponse.json(
      {
        error:
          "File not found on this server. On Vercel, connect Blob storage so uploads persist.",
      },
      { status: 404 },
    );
  }

  const bytes = await readFile(absolute);
  const filename = absolute.split("/").pop() || "file";
  const lower = filename.toLowerCase();
  const type = lower.endsWith(".png")
    ? "image/png"
    : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
      ? "image/jpeg"
      : lower.endsWith(".webp")
        ? "image/webp"
        : lower.endsWith(".pdf")
          ? "application/pdf"
          : "application/octet-stream";

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
