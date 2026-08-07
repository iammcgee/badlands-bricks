import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PRESENCE_COOKIE = "bb_presence";
const ONLINE_WINDOW_MS = 2 * 60 * 1000;

export async function GET() {
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  const onlineCount = await prisma.presenceSession.count({
    where: { lastSeenAt: { gte: cutoff } },
  });
  return NextResponse.json({ onlineCount });
}

export async function POST() {
  const jar = await cookies();
  let sessionKey = jar.get(PRESENCE_COOKIE)?.value;
  if (!sessionKey) {
    sessionKey = randomUUID();
  }

  const session = await auth();

  await prisma.presenceSession.upsert({
    where: { sessionKey },
    update: {
      lastSeenAt: new Date(),
      userId: session?.user?.id ?? null,
    },
    create: {
      sessionKey,
      lastSeenAt: new Date(),
      userId: session?.user?.id ?? null,
    },
  });

  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  // Cleanup stale sessions occasionally
  await prisma.presenceSession.deleteMany({
    where: { lastSeenAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  const onlineCount = await prisma.presenceSession.count({
    where: { lastSeenAt: { gte: cutoff } },
  });

  const response = NextResponse.json({ onlineCount });
  response.cookies.set(PRESENCE_COOKIE, sessionKey, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
