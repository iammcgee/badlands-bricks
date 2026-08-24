import type { PlanSubscription, Product } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/products";

/** Active-enough statuses that still unlock plan builds. */
export const PLAN_ACCESS_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function getPlanPriceCents(): number {
  const raw = process.env.BADLANDS_PLAN_PRICE_CENTS;
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return 999; // $9.99 / month
}

export function getPlanPriceLabel(): string {
  return `${formatPrice(getPlanPriceCents())}/mo`;
}

export function getPlanName(): string {
  return "Badlands Plan";
}

export function isPlanAccessActive(
  subscription: Pick<PlanSubscription, "status"> | null | undefined,
): boolean {
  if (!subscription) return false;
  return PLAN_ACCESS_STATUSES.has(subscription.status);
}

export async function getUserPlanSubscription(userId: string) {
  return prisma.planSubscription.findUnique({ where: { userId } });
}

export async function userHasPlanAccess(userId: string): Promise<boolean> {
  const sub = await getUserPlanSubscription(userId);
  return isPlanAccessActive(sub);
}

export function periodEndFromStripe(
  subscription: Stripe.Subscription,
): Date | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end;
  if (fromItem) return new Date(fromItem * 1000);

  // Older Stripe payloads still expose period end on the subscription object.
  const legacy = (subscription as { current_period_end?: number })
    .current_period_end;
  if (legacy) return new Date(legacy * 1000);
  return null;
}

export async function upsertPlanSubscriptionFromStripe(input: {
  userId: string;
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
}) {
  const { userId, stripeCustomerId, subscription } = input;
  return prisma.planSubscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: periodEndFromStripe(subscription),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    },
    update: {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: periodEndFromStripe(subscription),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    },
  });
}

export async function syncPlanSubscriptionByStripeId(
  subscription: Stripe.Subscription,
) {
  const existing = await prisma.planSubscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  const userId =
    existing?.userId ||
    (typeof subscription.metadata?.userId === "string"
      ? subscription.metadata.userId
      : null);

  if (!userId) return null;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return null;

  return upsertPlanSubscriptionFromStripe({
    userId,
    stripeCustomerId: customerId,
    subscription,
  });
}

export async function listPlanProducts(): Promise<
  (Product & { creator: { slug: string; displayName: string } })[]
> {
  return prisma.product.findMany({
    where: { isActive: true, includedInPlan: true },
    include: { creator: { select: { slug: true, displayName: true } } },
    orderBy: { name: "asc" },
  });
}
