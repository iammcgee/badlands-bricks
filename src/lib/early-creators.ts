import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** First N accounts get Founding Creator sell privileges without membership. */
export function getEarlyCreatorLimit(): number {
  const raw = process.env.EARLY_CREATOR_LIMIT;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 30;
}

export async function countEarlyCreators() {
  return prisma.user.count({
    where: { earlyCreatorNumber: { not: null } },
  });
}

export async function getEarlyCreatorSlotsRemaining() {
  const used = await countEarlyCreators();
  return Math.max(0, getEarlyCreatorLimit() - used);
}

/** Next founding-creator number to assign, or null if the cohort is full. */
export async function nextEarlyCreatorNumber(): Promise<number | null> {
  const limit = getEarlyCreatorLimit();
  const used = await countEarlyCreators();
  if (used >= limit) return null;

  const agg = await prisma.user.aggregate({
    _max: { earlyCreatorNumber: true },
  });
  const next = (agg._max.earlyCreatorNumber ?? 0) + 1;
  if (next > limit) return null;
  return next;
}

export function isEarlyCreatorNumber(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && value > 0;
}

/**
 * Assign founding-creator numbers to the earliest accounts (by signup time)
 * until the cohort limit is filled. Safe to re-run.
 */
export async function backfillEarlyCreatorCohort() {
  const limit = getEarlyCreatorLimit();
  const already = await countEarlyCreators();
  if (already >= limit) {
    return { assigned: 0, total: already };
  }

  const needed = limit - already;
  const candidates = await prisma.user.findMany({
    where: { earlyCreatorNumber: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: needed,
    select: { id: true },
  });

  let assigned = 0;
  for (const candidate of candidates) {
    const number = await nextEarlyCreatorNumber();
    if (number == null) break;
    try {
      await prisma.user.update({
        where: { id: candidate.id },
        data: { earlyCreatorNumber: number },
      });
      assigned += 1;
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

  return { assigned, total: already + assigned };
}
