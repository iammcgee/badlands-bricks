import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** First N Badlands Plan memberships get the first month free. */
export function getFoundingMemberLimit(): number {
  const raw =
    process.env.FOUNDING_MEMBER_LIMIT || process.env.EARLY_CREATOR_LIMIT;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 30;
}

export function getFoundingTrialDays(): number {
  const raw = process.env.FOUNDING_MEMBER_TRIAL_DAYS;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 30; // first month free
}

export async function countFoundingMembers() {
  return prisma.user.count({
    where: { foundingMemberNumber: { not: null } },
  });
}

export async function getFoundingMemberSlotsRemaining() {
  const used = await countFoundingMembers();
  return Math.max(0, getFoundingMemberLimit() - used);
}

export function isFoundingMemberNumber(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && value > 0;
}

/**
 * Reserve a founding-member slot for this user (1..limit).
 * Returns the number if they already have one or a new slot was claimed.
 * Returns null when the cohort is full.
 */
export async function claimFoundingMemberSlot(
  userId: string,
): Promise<number | null> {
  const limit = getFoundingMemberLimit();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { foundingMemberNumber: true },
        });
        if (!user) return null;
        if (user.foundingMemberNumber != null) {
          return user.foundingMemberNumber;
        }

        const used = await tx.user.count({
          where: { foundingMemberNumber: { not: null } },
        });
        if (used >= limit) return null;

        const agg = await tx.user.aggregate({
          _max: { foundingMemberNumber: true },
        });
        const next = (agg._max.foundingMemberNumber ?? 0) + 1;
        if (next > limit) return null;

        await tx.user.update({
          where: { id: userId },
          data: { foundingMemberNumber: next },
        });
        return next;
      });
      return result;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  const again = await prisma.user.findUnique({
    where: { id: userId },
    select: { foundingMemberNumber: true },
  });
  return again?.foundingMemberNumber ?? null;
}
