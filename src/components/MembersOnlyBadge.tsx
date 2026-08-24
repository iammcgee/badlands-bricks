import Link from "next/link";

type Props = {
  className?: string;
  href?: string | null;
  /** Smaller tag for cards / dense layouts */
  compact?: boolean;
  /** Tiny corner chip for small thumbnails (membership list). */
  micro?: boolean;
  /** When true, show unlocked icon; when false, locked. Omit for no lock icon. */
  unlocked?: boolean;
  /** Hide the MEMBERS ONLY text (icon-only). */
  iconOnly?: boolean;
};

function LockIcon({ unlocked, size }: { unlocked: boolean; size: number }) {
  if (unlocked) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M7 11V8a5 5 0 0 1 9.9-1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <rect
          x="4"
          y="11"
          width="16"
          height="10"
          rx="2"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="4"
        y="11"
        width="16"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

/** Consistent MEMBERS ONLY mark for exclusive membership builds. */
export function MembersOnlyBadge({
  className = "",
  href = "/plan",
  compact = false,
  micro = false,
  unlocked,
  iconOnly = false,
}: Props) {
  const showLock = typeof unlocked === "boolean";
  const iconSize = micro ? 11 : compact ? 12 : 14;

  const classes = micro
    ? `inline-flex items-center gap-1 bg-brand-orange px-1.5 py-0.5 text-[8px] font-bold leading-none tracking-[0.1em] text-black ${className}`
    : compact
      ? `inline-flex items-center gap-1 bg-brand-orange px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-black ${className}`
      : `inline-flex items-center gap-1.5 bg-brand-orange px-3 py-1.5 text-xs font-bold tracking-[0.16em] text-black ${className}`;

  const label = unlocked ? "UNLOCKED" : "MEMBERS ONLY";
  const content = (
    <>
      {showLock ? <LockIcon unlocked={unlocked} size={iconSize} /> : null}
      {iconOnly ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span>{label}</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        title={unlocked ? "Unlocked with membership" : "Members only"}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className={classes}
      title={unlocked ? "Unlocked with membership" : "Members only"}
    >
      {content}
    </span>
  );
}
