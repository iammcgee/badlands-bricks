import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().min(20),
  password: z.string().min(6).max(100),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const user = await consumePasswordResetToken(body.token);

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "Could not reset password" },
      { status: 500 },
    );
  }
}
