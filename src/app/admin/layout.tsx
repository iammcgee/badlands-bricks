import Link from "next/link";
import { adminLogoutAction } from "@/app/admin/actions";
import { getAdminAccess } from "@/lib/admin";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/mocs", label: "MOC Reviews" },
  { href: "/admin/products", label: "Build Catalog" },
  { href: "/admin/ops", label: "Under the Hood" },
  { href: "/admin/team", label: "Team" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccess();

  if (!access) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-full bg-black">
      <div className="border-b border-white/10 bg-neutral-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div>
            <p className="font-display text-2xl tracking-[0.08em] text-white">
              ADMIN PORTAL
            </p>
            <p className="text-xs text-white/50">
              Signed in as {access.label}
              {access.email ? ` · ${access.email}` : ""} · {access.role}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs tracking-[0.12em] text-white/70 transition hover:text-brand-orange"
              >
                {link.label.toUpperCase()}
              </Link>
            ))}
            <form action={adminLogoutAction}>
              <button
                type="submit"
                className="text-xs tracking-[0.12em] text-white/50 hover:text-brand-orange"
              >
                BACK TO SITE
              </button>
            </form>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
