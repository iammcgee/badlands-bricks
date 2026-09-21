import { NextResponse } from "next/server";
import { z } from "zod";
import { sendNotificationEmail } from "@/lib/email";
import {
  createPasswordResetToken,
  getSiteUrl,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    // Always return the same message to avoid email enumeration.
    const okResponse = NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, we sent a password reset link.",
    });

    if (!user) return okResponse;

    const { token } = await createPasswordResetToken(user.id);
    const resetUrl = `${getSiteUrl()}/reset-password?token=${token}`;

    await sendNotificationEmail({
      to: user.email,
      subject: "Reset your Badlands Bricks password",
      text: [
        `Hi ${user.name},`,
        "",
        "We received a request to reset your Badlands Bricks password.",
        "Open this link within the next hour to choose a new password:",
        "",
        resetUrl,
        "",
        "If you did not ask for this, you can ignore this email.",
        "",
        "— Badlands Bricks",
      ].join("\n"),
    });

    return okResponse;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Could not start password reset" },
      { status: 500 },
    );
  }
}
