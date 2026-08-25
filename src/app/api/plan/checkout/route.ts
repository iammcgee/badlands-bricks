import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  claimFoundingMemberSlot,
  getFoundingTrialDays,
} from "@/lib/founding-members";
import {
  getPlanName,
  getPlanPriceCents,
  isPlanAccessActive,
  getUserPlanSubscription,
} from "@/lib/plan";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env." },
        { status: 400 },
      );
    }

    const existing = await getUserPlanSubscription(session.user.id);
    if (isPlanAccessActive(existing)) {
      return NextResponse.json(
        {
          error: existing?.cancelAtPeriodEnd
            ? "Your plan is still active until the period ends. Use Manage Billing to renew."
            : "You already have an active Badlands Plan.",
        },
        { status: 400 },
      );
    }

    const stripe = getStripe()!;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const priceId = process.env.STRIPE_PLAN_PRICE_ID?.trim();
    const priceCents = getPlanPriceCents();

    // First 30 memberships claim a founding slot and get the first month free.
    const foundingMemberNumber = await claimFoundingMemberSlot(
      session.user.id,
    );
    const trialDays = foundingMemberNumber ? getFoundingTrialDays() : 0;

    let customerId = existing?.stripeCustomerId;
    if (!customerId) {
      const customers = await stripe.customers.list({
        email: session.user.email,
        limit: 1,
      });
      if (customers.data[0]) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: session.user.email,
          name: session.user.name || undefined,
          metadata: { userId: session.user.id },
        });
        customerId = customer.id;
      }
    }

    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: priceCents,
              recurring: { interval: "month" as const },
              product_data: {
                name: getPlanName(),
                description:
                  "Monthly membership with exclusive Badlands members-only MOC builds and the ability to sell your MOCs.",
              },
            },
          },
        ];

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: session.user.id,
      line_items: lineItems,
      metadata: {
        userId: session.user.id,
        kind: "badlands_plan",
        ...(foundingMemberNumber
          ? {
              foundingMemberNumber: String(foundingMemberNumber),
              firstMonthFree: "1",
            }
          : {}),
      },
      subscription_data: {
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
        metadata: {
          userId: session.user.id,
          kind: "badlands_plan",
          ...(foundingMemberNumber
            ? {
                foundingMemberNumber: String(foundingMemberNumber),
                firstMonthFree: "1",
              }
            : {}),
        },
      },
      success_url: `${siteUrl}/plan?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/plan?canceled=1`,
      allow_promotion_codes: true,
    });

    if (!checkout.url) {
      return NextResponse.json(
        { error: "Could not start checkout" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: checkout.url,
      foundingMemberNumber,
      firstMonthFree: Boolean(foundingMemberNumber),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
