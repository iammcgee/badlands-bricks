import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitMocForm } from "@/components/SubmitMocForm";
import { getAdminAccess } from "@/lib/admin";
import { hasBlobStorage } from "@/lib/moc-files";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create MOC" };

export default async function AdminCreateMocPage() {
  const access = await getAdminAccess();
  if (!access) redirect("/admin");
  const useBlobUploads = hasBlobStorage();

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-8">
      <div>
        <Link
          href="/admin/mocs"
          className="text-xs text-white/50 hover:text-brand-orange"
        >
          ← BACK TO MOC REVIEWS
        </Link>
        <h1 className="mt-3 font-display text-4xl tracking-[0.08em] text-white">
          CREATE MOC
        </h1>
        <p className="mt-2 max-w-2xl text-white/60">
          Upload Badlands staff MOCs here — same photo organizer and PDF
          builder, without going through the public submit flow. Defaults to
          approved.
        </p>
      </div>
      <SubmitMocForm mode="admin" useBlobUploads={useBlobUploads} />
    </div>
  );
}
