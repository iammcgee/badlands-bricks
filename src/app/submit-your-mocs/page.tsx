import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitMocForm } from "@/components/SubmitMocForm";
import { auth } from "@/lib/auth";

export const metadata = { title: "SUBMIT YOUR MOCS" };

export default async function SubmitMocsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/submit-your-mocs");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <div className="max-w-3xl">
        <p className="text-xs tracking-[0.16em] text-brand-orange">
          MOC BUILDER
        </p>
        <h1 className="mt-3 font-display text-5xl tracking-[0.08em] text-white md:text-6xl">
          SUBMIT YOUR MOC
        </h1>
        <p className="mt-4 text-white/70">
          Upload your photos, drag them into the right order, and we&apos;ll
          turn your instruction steps into a clean PDF — right here, no Adobe
          needed. You&apos;re signed in as{" "}
          <span className="text-white">
            {session.user.name || session.user.email}
          </span>
          , so we already have your name and email. Track approval under{" "}
          <Link href="/my-mocs" className="text-brand-orange hover:underline">
            My MOCs
          </Link>
          .
        </p>
      </div>
      <div className="mt-10">
        <SubmitMocForm mode="user" />
      </div>
    </div>
  );
}
