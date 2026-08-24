import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserPlanSubscription } from "@/lib/plan";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

/** Stripe Customer Portal for cancel / update payment method. */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 400 },
      );
    }

    const sub = await getUserPlanSubscription(session.user.id);
    if (!sub?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Subscribe first." },
        { status: 400 },
      );
    }

    const stripe = getStripe()!;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${siteUrl}/plan`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
