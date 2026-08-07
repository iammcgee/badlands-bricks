import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Following" };

export default async function FollowingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/following");
  }

  const follows = await prisma.follow.findMany({
    where: { followerUserId: session.user.id },
    include: {
      creator: {
        include: {
          _count: { select: { followers: true, products: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-8">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
        FOLLOWING
      </h1>
      <p className="mt-3 text-white/70">Creators you follow.</p>

      {follows.length === 0 ? (
        <div className="mt-10 text-white/60">
          <p>You are not following anyone yet.</p>
          <Link href="/creators/badlands-bricks" className="mt-4 inline-block text-brand-orange">
            Visit Badlands Bricks
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-4">
          {follows.map((follow) => (
            <Link
              key={follow.id}
              href={`/creators/${follow.creator.slug}`}
              className="flex items-center justify-between border border-white/15 px-4 py-4 transition hover:border-brand-orange"
            >
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={follow.creator.avatarPath || "/brand/logo.png"}
                  alt={follow.creator.displayName}
                  className="h-12 w-12 rounded-full object-contain"
                />
                <div>
                  <p className="font-display text-xl tracking-[0.06em] text-white">
                    {follow.creator.displayName.toUpperCase()}
                  </p>
                  <p className="text-sm text-white/60">
                    {follow.creator._count.followers} followers ·{" "}
                    {follow.creator._count.products} MOCs
                  </p>
                </div>
              </div>
              <span className="text-sm text-brand-orange">VIEW</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
