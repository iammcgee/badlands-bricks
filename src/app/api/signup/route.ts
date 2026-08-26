import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { notifyNewUserSignup } from "@/lib/admin-notifications";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    try {
      await notifyNewUserSignup(user);
    } catch (error) {
      // Signup succeeded; don't fail the user if admin alert fails.
      console.error("[signup admin notify failed]", error);
    }

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid signup data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
