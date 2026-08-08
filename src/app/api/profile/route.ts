import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 900_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  password: z.string().min(6).max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      avatarData: true,
      updatedAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.avatarData
      ? `/api/avatars/${user.id}?v=${user.updatedAt.getTime()}`
      : null,
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const parsed = profileSchema.parse({
      name: form.get("name") ? String(form.get("name")) : undefined,
      password: form.get("password") ? String(form.get("password")) : undefined,
    });

    const data: Prisma.UserUpdateInput = {};

    if (parsed.name) {
      data.name = parsed.name.trim();
    }

    if (parsed.password) {
      data.passwordHash = await bcrypt.hash(parsed.password, 10);
    }

    const avatar = form.get("avatar");
    if (avatar instanceof File && avatar.size > 0) {
      if (!ALLOWED_MIME.has(avatar.type)) {
        return NextResponse.json(
          { error: "Avatar must be a JPG, PNG, or WebP image" },
          { status: 400 },
        );
      }
      if (avatar.size > MAX_AVATAR_BYTES) {
        return NextResponse.json(
          { error: "Avatar must be under 1.5MB" },
          { status: 400 },
        );
      }
      data.avatarMime = avatar.type;
      data.avatarData = Buffer.from(await avatar.arrayBuffer());
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        avatarData: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatarData
          ? `/api/avatars/${user.id}?v=${user.updatedAt.getTime()}`
          : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid profile data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }
}
