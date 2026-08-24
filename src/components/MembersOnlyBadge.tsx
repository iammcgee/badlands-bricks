import Link from "next/link";

type Props = {
  className?: string;
  href?: string | null;
  /** Smaller tag for cards / dense layouts */
  compact?: boolean;
};

/** Consistent MEMBERS ONLY mark for exclusive membership builds. */
export function MembersOnlyBadge({
  className = "",
  href = "/plan",
  compact = false,
}: Props) {
  const classes = compact
    ? `inline-block bg-brand-orange px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-black ${className}`
    : `inline-block bg-brand-orange px-3 py-1.5 text-xs font-bold tracking-[0.16em] text-black ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        MEMBERS ONLY
      </Link>
    );
  }

  return <span className={classes}>MEMBERS ONLY</span>;
}
