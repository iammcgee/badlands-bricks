import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createDownloadTokensForOrder } from "@/lib/downloads";
import {
  syncPlanSubscriptionByStripeId,
  upsertPlanSubscriptionFromStripe,
} from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  if (session.mode === "subscription") {
    const userId =
      session.metadata?.userId ||
      session.client_reference_id ||
      undefined;
    if (!userId || typeof session.subscription !== "string") return;

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    if (!customerId) return;

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
    );
    await upsertPlanSubscriptionFromStripe({
      userId,
      stripeCustomerId: customerId,
      subscription,
    });
    return;
  }

  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "paid",
      stripeSessionId: session.id,
      email:
        session.customer_details?.email ||
        session.customer_email ||
        undefined,
    },
  });
  await createDownloadTokensForOrder(orderId);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 400 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(stripe, event.data.object);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncPlanSubscriptionByStripeId(event.data.object);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler failed", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
