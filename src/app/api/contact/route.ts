import { NextResponse } from "next/server";
import { z } from "zod";
import { sendNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(1).max(5000),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    await prisma.contactMessage.create({
      data: body,
    });

    await sendNotificationEmail({
      subject: `Contact form: ${body.name}`,
      text: `From: ${body.name} <${body.email}>\n\n${body.message}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
