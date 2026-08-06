import Link from "next/link";
import { createDownloadTokensForOrder, getOrderDownloads } from "@/lib/downloads";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Complete" };

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; session_id?: string }>;
}) {
  const { orderId: orderIdParam, session_id: sessionId } = await searchParams;
  let orderId = orderIdParam;

  if (!orderId && sessionId) {
    const stripe = getStripe();
    if (stripe) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.metadata?.orderId) {
        orderId = session.metadata.orderId;
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "paid",
            email: session.customer_details?.email || session.customer_email || undefined,
          },
        });
        await createDownloadTokensForOrder(orderId);
      }
    }
  }

  if (!orderId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl text-white">ORDER NOT FOUND</h1>
        <Link href="/build" className="mt-6 inline-block text-brand-orange">
          Back to builds
        </Link>
      </div>
    );
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-4xl text-white">ORDER NOT FOUND</h1>
      </div>
    );
  }

  if (order.status === "paid" || order.status === "fulfilled") {
    await createDownloadTokensForOrder(order.id);
  }

  const downloads = await getOrderDownloads(order.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 md:px-8">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
        YOU&apos;RE READY TO BUILD
      </h1>
      <p className="mt-4 text-white/70">
        Thanks{order.email ? `, ${order.email}` : ""}. Your digital instruction
        downloads are below.
      </p>

      <div className="mt-8 space-y-3">
        {downloads.length === 0 && (
          <p className="text-white/60">
            Downloads are being prepared. If this order was paid via Stripe,
            refresh in a moment after the webhook confirms payment.
          </p>
        )}
        {downloads.map((item) => (
          <a
            key={item.token}
            href={`/downloads/${item.token}`}
            className="flex items-center justify-between border border-white/20 px-4 py-4 text-white transition hover:border-brand-orange"
          >
            <span>{item.productName} Instructions</span>
            <span className="text-sm text-brand-orange">DOWNLOAD</span>
          </a>
        ))}
      </div>

      <Link
        href="/build"
        className="mt-10 inline-block bg-brand-orange px-6 py-3 text-sm font-bold tracking-[0.14em] text-white"
      >
        KEEP BUILDING
      </Link>
    </div>
  );
}
