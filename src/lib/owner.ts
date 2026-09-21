/** Site owner who can demote/delete admin accounts. */
export const PRIMARY_OWNER_EMAIL = "canaanmcgee@gmail.com";

export function isPrimaryOwnerEmail(email?: string | null): boolean {
  return (email || "").trim().toLowerCase() === PRIMARY_OWNER_EMAIL;
}

export function canRemoveAdmins(access: {
  mode: "password" | "role";
  email?: string;
}): boolean {
  // Shared ADMIN_PASSWORD cookie is treated as full owner control.
  if (access.mode === "password") return true;
  return isPrimaryOwnerEmail(access.email);
}
