import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.badlandsbricks.com"
  );
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { token, expiresAt };
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashPasswordResetToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true } } },
  });

  if (!record) return null;
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } });
    return null;
  }

  await prisma.passwordResetToken.deleteMany({
    where: { userId: record.userId },
  });

  return record.user;
}
