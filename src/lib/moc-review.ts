export const MOC_STATUSES = [
  "new",
  "approved",
  "denied",
  "needs_changes",
] as const;

export type MocStatus = (typeof MOC_STATUSES)[number];

export function parseJsonStringArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function mocStatusLabel(status: string): string {
  switch (status) {
    case "new":
      return "Pending";
    case "approved":
      return "Approved";
    case "denied":
      return "Denied";
    case "needs_changes":
      return "Needs changes";
    case "reviewed":
      return "Reviewed";
    case "note":
      return "Note";
    default:
      return status;
  }
}

export function mocStatusClass(status: string): string {
  switch (status) {
    case "new":
      return "text-brand-orange";
    case "approved":
      return "text-green-400";
    case "denied":
      return "text-red-400";
    case "needs_changes":
      return "text-yellow-300";
    default:
      return "text-white/60";
  }
}
