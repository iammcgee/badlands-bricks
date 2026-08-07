import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  creatorId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const { creatorId } = schema.parse(await request.json());
    const creator = await prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator) {
      return NextResponse.json({ error: "Creator not found" }, { status: 404 });
    }

    const existing = await prisma.follow.findUnique({
      where: {
        followerUserId_creatorId: {
          followerUserId: session.user.id,
          creatorId,
        },
      },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      const followerCount = await prisma.follow.count({ where: { creatorId } });
      return NextResponse.json({ following: false, followerCount });
    }

    await prisma.follow.create({
      data: {
        followerUserId: session.user.id,
        creatorId,
      },
    });
    const followerCount = await prisma.follow.count({ where: { creatorId } });
    return NextResponse.json({ following: true, followerCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Follow failed" }, { status: 500 });
  }
}
