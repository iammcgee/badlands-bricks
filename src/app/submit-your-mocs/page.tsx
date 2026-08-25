import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitMocForm } from "@/components/SubmitMocForm";
import { auth } from "@/lib/auth";
import { hasBlobStorage } from "@/lib/moc-files";
import { getCreatorSellAccess, getPlanPriceLabel } from "@/lib/plan";

export const metadata = { title: "SUBMIT YOUR MOCS" };

export default async function SubmitMocsPage({
  searchParams,
}: {
  searchParams: Promise<{ founding?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/submit-your-mocs");
  }
  const query = await searchParams;
  const useBlobUploads = hasBlobStorage();
  const sellAccess = await getCreatorSellAccess(session.user.id);
  const planPriceLabel = getPlanPriceLabel();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <div className="max-w-3xl">
        <p className="text-xs tracking-[0.16em] text-brand-orange">
          MOC BUILDER
        </p>
        <h1 className="mt-3 font-display text-5xl tracking-[0.08em] text-white md:text-6xl">
          SUBMIT YOUR MOC
        </h1>
        {query.founding ? (
          <p className="mt-4 border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm text-brand-orange">
            Welcome, Founding Creator #{query.founding}. You can list MOCs for
            sale without a paid membership — one of the first 30 accounts on
            Badlands Bricks.
          </p>
        ) : null}
        <p className="mt-4 text-white/70">
          Upload your photos, drag them into the right order, and we&apos;ll
          turn your instruction steps into a clean PDF — right here, no Adobe
          needed. Submitting is free for everyone.{" "}
          {sellAccess.reason === "early_creator" ? (
            <>
              You&apos;re{" "}
              <span className="text-white">
                Founding Creator #{sellAccess.earlyCreatorNumber}
              </span>
              , so you can also{" "}
              <span className="text-white">list MOCs for sale</span> and profit
              when shoppers buy your instructions.
            </>
          ) : sellAccess.reason === "membership" ? (
            <>
              Your Badlands Plan is active, so you can also{" "}
              <span className="text-white">list MOCs for sale</span> and profit
              when shoppers buy your instructions.
            </>
          ) : (
            <>
              Want to sell your builds?{" "}
              <Link href="/plan" className="text-brand-orange hover:underline">
                Join the Badlands Plan
              </Link>{" "}
              ({planPriceLabel}) to unlock paid listings — or grab a Founding
              Creator spot while the first 30 accounts are still open.
            </>
          )}
        </p>
        <p className="mt-3 text-sm text-white/50">
          Signed in as{" "}
          <span className="text-white">
            {session.user.name || session.user.email}
          </span>
          . Track approval under{" "}
          <Link href="/my-mocs" className="text-brand-orange hover:underline">
            My MOCs
          </Link>
          .
        </p>
      </div>
      {!useBlobUploads && process.env.VERCEL ? (
        <p className="mt-6 border border-yellow-300/40 bg-yellow-300/10 px-4 py-3 text-sm text-yellow-100">
          File storage is not fully configured on this server yet. Submits with
          lots of photos may fail before they reach the admin queue. Ask an
          admin to connect Vercel Blob (`BLOB_READ_WRITE_TOKEN`).
        </p>
      ) : null}
      <div className="mt-10">
        <SubmitMocForm
          mode="user"
          useBlobUploads={useBlobUploads}
          canSell={sellAccess.canSell}
          sellReason={sellAccess.reason}
          earlyCreatorNumber={sellAccess.earlyCreatorNumber}
          planPriceLabel={planPriceLabel}
        />
      </div>
    </div>
  );
}
