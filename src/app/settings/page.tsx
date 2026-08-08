import { redirect } from "next/navigation";
import { ProfileSettingsForm } from "@/components/ProfileSettingsForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/settings");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      avatarData: true,
      updatedAt: true,
      id: true,
    },
  });
  if (!user) redirect("/login?next=/settings");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <h1 className="font-display text-4xl tracking-[0.08em] text-white md:text-5xl">
        ACCOUNT SETTINGS
      </h1>
      <p className="mt-3 text-white/70">
        Update your builder name, avatar photo, and password.
      </p>
      <ProfileSettingsForm
        initialName={user.name}
        initialEmail={user.email}
        initialImage={
          user.avatarData
            ? `/api/avatars/${user.id}?v=${user.updatedAt.getTime()}`
            : null
        }
      />
    </div>
  );
}
