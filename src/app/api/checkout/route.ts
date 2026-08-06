import { NextResponse } from "next/server";
import { z } from "zod";
import { createDownloadTokensForOrder } from "@/lib/downloads";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

const bodySchema = z.object({
  email: z.string().email(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().max(20),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);

    const products = await prisma.product.findMany({
      where: {
        id: { in: body.items.map((item) => item.productId) },
        isActive: true,
      },
    });

    if (products.length !== body.items.length) {
      return NextResponse.json(
        { error: "One or more products are unavailable" },
        { status: 400 },
      );
    }

    const lineItems = body.items.map((item) => {
      const product = products.find((row) => row.id === item.productId)!;
      return {
        product,
        quantity: item.quantity,
        priceCents: product.priceCents,
      };
    });

    const totalCents = lineItems.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );

    const order = await prisma.order.create({
      data: {
        email: body.email,
        status: totalCents === 0 ? "paid" : "pending",
        totalCents,
        items: {
          create: lineItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            priceCents: item.priceCents,
          })),
        },
      },
    });

    if (totalCents === 0) {
      await createDownloadTokensForOrder(order.id);
      return NextResponse.json({ free: true, orderId: order.id });
    }

    if (!isStripeConfigured()) {
      await prisma.order.delete({ where: { id: order.id } });
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Add STRIPE_SECRET_KEY to .env, or checkout free items only.",
        },
        { status: 400 },
      );
    }

    const stripe = getStripe()!;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items: lineItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "usd",
          unit_amount: item.priceCents,
          product_data: {
            name: item.product.name,
            description: "Digital building instructions",
          },
        },
      })),
      metadata: { orderId: order.id },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/cart`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid checkout data" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
