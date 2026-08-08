import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const ADMIN_COOKIE = "bb_admin";

export type StaffRole = "admin" | "reviewer";

export type AdminAccess = {
  mode: "password" | "role";
  role: StaffRole;
  userId?: string;
  label: string;
  email?: string;
};

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "changeme";
}

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return role === "admin" || role === "reviewer";
}

export async function getAdminAccess(): Promise<AdminAccess | null> {
  const jar = await cookies();
  if (jar.get(ADMIN_COOKIE)?.value === getAdminPassword()) {
    return {
      mode: "password",
      role: "admin",
      label: "Owner (password)",
    };
  }

  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!user || !isStaffRole(user.role)) return null;

  return {
    mode: "role",
    role: user.role,
    userId: user.id,
    label: user.name,
    email: user.email,
  };
}

export async function requireAdminAccess(
  minimum: StaffRole = "reviewer",
): Promise<AdminAccess> {
  const access = await getAdminAccess();
  if (!access) {
    throw new Error("UNAUTHORIZED");
  }
  if (minimum === "admin" && access.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return access;
}

/** @deprecated use getAdminAccess */
export async function isAdminAuthenticated(): Promise<boolean> {
  return Boolean(await getAdminAccess());
}
