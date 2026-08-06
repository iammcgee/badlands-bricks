import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bb_admin";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "changeme";
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === getAdminPassword();
}
