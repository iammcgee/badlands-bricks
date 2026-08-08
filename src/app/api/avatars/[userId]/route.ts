import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarData: true, avatarMime: true, updatedAt: true },
  });

  if (!user?.avatarData || !user.avatarMime) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(user.avatarData), {
    headers: {
      "Content-Type": user.avatarMime,
      "Cache-Control": "public, max-age=3600",
      "Last-Modified": user.updatedAt.toUTCString(),
    },
  });
}
