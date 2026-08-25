import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { nextEarlyCreatorNumber } from "@/lib/early-creators";
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
    const name = body.name.trim();

    let user:
      | {
          id: string;
          email: string;
          name: string;
          earlyCreatorNumber: number | null;
        }
      | null = null;

    // Retry a few times if another signup claims the same founding slot.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const earlyCreatorNumber = await nextEarlyCreatorNumber();
      try {
        user = await prisma.user.create({
          data: {
            name,
            email,
            passwordHash,
            earlyCreatorNumber,
          },
          select: {
            id: true,
            email: true,
            name: true,
            earlyCreatorNumber: true,
          },
        });
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const target = String(error.meta?.target || "");
          if (target.includes("email")) {
            return NextResponse.json(
              { error: "An account with that email already exists" },
              { status: 400 },
            );
          }
          // Unique clash on earlyCreatorNumber — try again.
          continue;
        }
        throw error;
      }
    }

    if (!user) {
      user = await prisma.user.create({
        data: { name, email, passwordHash },
        select: {
          id: true,
          email: true,
          name: true,
          earlyCreatorNumber: true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      user,
      earlyCreator: user.earlyCreatorNumber != null,
      earlyCreatorNumber: user.earlyCreatorNumber,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid signup data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
