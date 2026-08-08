"use client";

export function UserAvatar({
  name,
  image,
  size = 36,
}: {
  name?: string | null;
  image?: string | null;
  size?: number;
}) {
  const initials = (name || "?").trim().slice(0, 1).toUpperCase() || "?";

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name || "Account"}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-brand-orange font-display text-white"
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.4) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
