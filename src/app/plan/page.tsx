import Link from "next/link";
import { PlanSubscribeButton } from "@/components/PlanSubscribeButton";
import { auth } from "@/lib/auth";
import {
  getPlanName,
  getPlanPriceLabel,
  isPlanAccessActive,
  listPlanProducts,
  getUserPlanSubscription,
  upsertPlanSubscriptionFromStripe,
} from "@/lib/plan";
import { formatPrice } from "@/lib/products";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Badlands Plan" };

/** After Checkout redirect, webhook may lag — sync from the Checkout Session. */
async function syncPlanAfterCheckout(
  userId: string,
  checkoutSessionId?: string | null,
) {
  if (!isStripeConfigured()) return;
  const existing = await getUserPlanSubscription(userId);
  if (isPlanAccessActive(existing)) return;

  const stripe = getStripe();
  if (!stripe) return;

  if (checkoutSessionId) {
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ["subscription"],
    });
    if (session.mode !== "subscription") return;
    if (
      session.metadata?.userId &&
      session.metadata.userId !== userId &&
      session.client_reference_id !== userId
    ) {
      return;
    }

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id;
    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    if (customerId && subscription && !("deleted" in subscription)) {
      await upsertPlanSubscriptionFromStripe({
        userId,
        stripeCustomerId: customerId,
        subscription,
      });
    }
    return;
  }

  const customerId = existing?.stripeCustomerId;
  if (!customerId) return;

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 5,
  });
  const best =
    subs.data.find((s) => s.status === "active" || s.status === "trialing") ||
    subs.data.find((s) => s.status === "past_due") ||
    subs.data[0];
  if (!best) return;

  await upsertPlanSubscriptionFromStripe({
    userId,
    stripeCustomerId: customerId,
    subscription: best,
  });
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{
    subscribed?: string;
    canceled?: string;
    session_id?: string;
  }>;
}) {
  const query = await searchParams;
  const session = await auth();

  if (session?.user?.id && query.subscribed) {
    try {
      await syncPlanAfterCheckout(session.user.id, query.session_id);
    } catch (error) {
      console.error("Plan post-checkout sync failed", error);
    }
  }

  const products = await listPlanProducts();
  const subscription = session?.user?.id
    ? await getUserPlanSubscription(session.user.id)
    : null;
  const hasActivePlan = isPlanAccessActive(subscription);
  const priceLabel = getPlanPriceLabel();
  const stripeReady = isStripeConfigured();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <p className="text-xs tracking-[0.18em] text-white/50">MEMBERSHIP</p>
      <h1 className="mt-3 font-display text-5xl tracking-[0.08em] text-white md:text-6xl">
        {getPlanName().toUpperCase()}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
        One monthly fee unlocks every build in the plan — starting with{" "}
        <span className="text-white">Max Flex</span>,{" "}
        <span className="text-white">Bee Buggy</span>, and{" "}
        <span className="text-white">Trophy Truck</span>. Buy individually
        anytime, or subscribe and download while you&apos;re a member.
      </p>

      <div className="mt-8 flex flex-wrap items-end gap-6 border-y border-white/10 py-8">
        <div>
          <p className="font-display text-4xl text-brand-orange">{priceLabel}</p>
          <p className="mt-1 text-sm text-white/50">Cancel anytime in billing</p>
        </div>
        <div className="flex-1 min-w-[220px]">
          {stripeReady ? (
            <PlanSubscribeButton
              signedIn={Boolean(session?.user)}
              hasActivePlan={hasActivePlan}
              cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd}
              priceLabel={priceLabel}
            />
          ) : (
            <p className="text-sm text-red-300">
              Stripe isn&apos;t configured yet — add{" "}
              <code className="text-white/70">STRIPE_SECRET_KEY</code> to enable
              subscriptions.
            </p>
          )}
        </div>
      </div>

      {query.subscribed ? (
        <p className="mt-6 border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          Welcome aboard. Your plan builds are ready to download below.
        </p>
      ) : null}
      {query.canceled ? (
        <p className="mt-6 border border-white/15 px-4 py-3 text-sm text-white/60">
          Checkout canceled — you can subscribe whenever you&apos;re ready.
        </p>
      ) : null}

      <section className="mt-12 space-y-6">
        <h2 className="font-display text-3xl tracking-[0.06em] text-white">
          INCLUDED BUILDS
        </h2>
        {products.length === 0 ? (
          <p className="text-white/50">
            Plan builds will appear here once they&apos;re marked in the catalog.
          </p>
        ) : (
          <ul className="divide-y divide-white/10 border border-white/10">
            {products.map((product) => {
              const image = (() => {
                try {
                  const parsed = JSON.parse(product.imagesJson) as unknown;
                  return Array.isArray(parsed) && typeof parsed[0] === "string"
                    ? parsed[0]
                    : "/products/placeholder.svg";
                } catch {
                  return "/products/placeholder.svg";
                }
              })();

              return (
                <li
                  key={product.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt=""
                      className="h-20 w-28 object-cover bg-neutral-900"
                    />
                    <div>
                      <Link
                        href={`/build/${product.slug}`}
                        className="font-display text-xl tracking-[0.06em] text-white hover:text-brand-orange"
                      >
                        {product.name.toUpperCase()}
                      </Link>
                      <p className="mt-1 text-xs text-white/45">
                        Individual {formatPrice(product.priceCents)} · by{" "}
                        {product.creator.displayName}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/build/${product.slug}`}
                      className="border border-white/20 px-4 py-2 text-xs tracking-[0.14em] text-white hover:border-brand-orange"
                    >
                      VIEW
                    </Link>
                    {hasActivePlan && product.downloadFilePath ? (
                      <a
                        href={`/api/plan/download/${product.id}`}
                        className="bg-brand-orange px-4 py-2 text-xs font-bold tracking-[0.14em] text-white hover:bg-orange-500"
                      >
                        DOWNLOAD
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-10 max-w-2xl text-sm text-white/45">
        Individual purchases still work the same way through cart checkout.
        Plan members get ongoing access to every build marked as included —
        no need to buy those separately while subscribed.
      </p>
    </div>
  );
}
