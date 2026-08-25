import Link from "next/link";
import { PlanSubscribeButton } from "@/components/PlanSubscribeButton";
import { MembersOnlyBadge } from "@/components/MembersOnlyBadge";
import { auth } from "@/lib/auth";
import {
  getFoundingMemberLimit,
  getFoundingMemberSlotsRemaining,
} from "@/lib/founding-members";
import {
  getPlanName,
  getPlanPriceLabel,
  isPlanAccessActive,
  listPlanProducts,
  getUserPlanSubscription,
  upsertPlanSubscriptionFromStripe,
} from "@/lib/plan";
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
  const foundingRemaining = await getFoundingMemberSlotsRemaining();
  const foundingLimit = getFoundingMemberLimit();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <p className="text-xs tracking-[0.18em] text-white/50">MEMBERSHIP</p>
      <h1 className="mt-3 font-display text-5xl tracking-[0.08em] text-white md:text-6xl">
        {getPlanName().toUpperCase()}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/70">
        Join Badlands Plan for exclusive members-only builds — starting with{" "}
        <span className="text-white">Max Flex</span>,{" "}
        <span className="text-white">Bee Buggy</span>, and{" "}
        <span className="text-white">Trophy Truck</span> — and unlock the
        ability to <span className="text-white">sell your own MOCs</span> in the
        shop. Anyone can still upload builds for free.
      </p>

      {foundingRemaining > 0 ? (
        <p className="mt-6 border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
          Founding membership offer: the first {foundingLimit} people who join
          the plan get their <span className="text-white">first month free</span>
          . {foundingRemaining} spot{foundingRemaining === 1 ? "" : "s"} left.
        </p>
      ) : (
        <p className="mt-6 border border-white/15 px-4 py-3 text-sm text-white/55">
          The founding first-month-free offer ({foundingLimit} memberships) is
          full. New members still unlock exclusive builds and MOC selling at the
          regular monthly rate.
        </p>
      )}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        <li className="border border-white/15 px-4 py-4 text-sm text-white/70">
          <p className="font-semibold tracking-[0.08em] text-white">
            MEMBERS-ONLY BUILDS
          </p>
          <p className="mt-2">
            Download exclusive Badlands instruction sets while your plan is
            active.
          </p>
        </li>
        <li className="border border-brand-orange/40 bg-brand-orange/5 px-4 py-4 text-sm text-white/70">
          <p className="font-semibold tracking-[0.08em] text-brand-orange">
            SELL YOUR MOCS
          </p>
          <p className="mt-2">
            Set a price when you submit. Membership unlocks selling so you can
            profit from approved MOCs. Free uploads stay available without a
            plan.
          </p>
        </li>
      </ul>

      <div className="mt-8 flex flex-wrap items-end gap-6 border-y border-white/10 py-8">
        <div>
          <p className="font-display text-4xl text-brand-orange">{priceLabel}</p>
          <p className="mt-1 text-sm text-white/50">
            {foundingRemaining > 0
              ? "First month free for founding members"
              : "Cancel anytime in billing"}
          </p>
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
          Welcome aboard. Your members-only builds are ready to download below.
        </p>
      ) : null}
      {query.canceled ? (
        <p className="mt-6 border border-white/15 px-4 py-3 text-sm text-white/60">
          Checkout canceled — you can subscribe whenever you&apos;re ready.
        </p>
      ) : null}

      <section className="mt-12 space-y-6">
        <h2 className="font-display text-3xl tracking-[0.06em] text-white">
          MEMBERS-ONLY BUILDS
        </h2>
        {products.length === 0 ? (
          <p className="text-white/50">
            Exclusive membership builds will appear here once they&apos;re marked
            in the catalog.
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
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt=""
                        className="h-20 w-28 object-cover bg-neutral-900"
                      />
                      <div className="absolute left-1.5 top-1.5">
                        <MembersOnlyBadge
                          micro
                          iconOnly
                          href={null}
                          unlocked={hasActivePlan}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/build/${product.slug}`}
                          className="font-display text-xl tracking-[0.06em] text-white hover:text-brand-orange"
                        >
                          {product.name.toUpperCase()}
                        </Link>
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-white/45">
                        <MembersOnlyBadge
                          micro
                          href={null}
                          unlocked={hasActivePlan}
                        />
                        <span>· by {product.creator.displayName}</span>
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
        Members-only Badlands builds stay exclusive to subscribers. Membership
        unlocks selling your own community MOCs. The first{" "}
        {foundingLimit} people who join the plan get their first month free —
        after that, standard monthly billing applies. Uploads without a plan
        still publish as free builds after approval.
      </p>
    </div>
  );
}
