/** Extract a YouTube video id from common share/watch/embed URL shapes. */
export function extractYoutubeVideoId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return isValidYoutubeId(id) ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const watchId = url.searchParams.get("v");
      if (watchId && isValidYoutubeId(watchId)) return watchId;

      const parts = url.pathname.split("/").filter(Boolean);
      if (
        parts[0] &&
        ["embed", "shorts", "live", "v"].includes(parts[0].toLowerCase()) &&
        parts[1] &&
        isValidYoutubeId(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    // Fall through to regex for bare ids / messy paste.
  }

  const bare = value.match(/^[a-zA-Z0-9_-]{11}$/);
  if (bare) return bare[0];

  const loose = value.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/,
  );
  return loose?.[1] ?? null;
}

function isValidYoutubeId(id: string) {
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

/** Normalize any paste into a canonical watch URL, or null if invalid/empty. */
export function normalizeYoutubeUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const id = extractYoutubeVideoId(raw);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const id = extractYoutubeVideoId(raw);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

export function isValidYoutubeUrl(raw: string): boolean {
  if (!raw.trim()) return true;
  return Boolean(extractYoutubeVideoId(raw));
}
