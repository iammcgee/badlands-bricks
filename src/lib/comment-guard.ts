const FRIENDLY_REJECT =
  "Keep it about the build — no nasty comments, slurs, or pictures.";

const IMAGE_URL =
  /https?:\/\/\S+\.(?:png|jpe?g|gif|webp|bmp|svg|avif|heic)(?:\?\S*)?/i;
const DATA_IMAGE = /data:image\//i;
const MARKDOWN_IMAGE = /!\[[^\]]*]\(\s*[^)]+\)/;
const HTML_IMAGE = /<\s*img\b/i;
const HTML_TAG = /<\/?[a-z][^>]*>/gi;
const URL_PATTERN = /https?:\/\/[^\s]+/gi;

/** Mild swearing is fine. Block slurs, porn, threats, and image dumps. */
const BLOCKED_PHRASES = [
  "kill yourself",
  "kys",
  "child porn",
  "child pornography",
  "onlyfans",
  "pornhub",
];

const BLOCKED_WORDS = [
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "retarded",
  "rape",
  "rapist",
  "porn",
  "porno",
  "xxx",
  "nsfw",
  "loli",
  "shota",
  "penis",
  "pussy",
  "blowjob",
  "handjob",
  "cum",
  "orgasm",
  "dildo",
  "hentai",
];

function foldForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/0/g, "o")
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/[5$]/g, "s")
    .replace(/7/g, "t")
    .replace(/(.)\1{2,}/g, "$1$1")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasBlockedLanguage(folded: string) {
  const padded = ` ${folded} `;
  if (BLOCKED_PHRASES.some((phrase) => padded.includes(` ${phrase} `))) {
    return true;
  }
  const tokens = new Set(folded.split(" ").filter(Boolean));
  return BLOCKED_WORDS.some((word) => tokens.has(word));
}

export function sanitizeCommentBody(raw: string) {
  return raw
    .replace(HTML_TAG, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function moderateComment(raw: string):
  | { ok: true; body: string }
  | { ok: false; error: string } {
  const body = sanitizeCommentBody(raw);
  if (!body) {
    return { ok: false, error: "Comment cannot be empty" };
  }

  if (
    DATA_IMAGE.test(body) ||
    MARKDOWN_IMAGE.test(body) ||
    HTML_IMAGE.test(body) ||
    IMAGE_URL.test(body)
  ) {
    return { ok: false, error: FRIENDLY_REJECT };
  }

  const urls = body.match(URL_PATTERN) ?? [];
  if (urls.length > 2) {
    return {
      ok: false,
      error: "Too many links — keep it to a couple, or none.",
    };
  }

  const letters = body.replace(/\s/g, "");
  if (letters.length >= 28 && letters === letters.toUpperCase() && /[A-Z]/.test(letters)) {
    return { ok: false, error: "Ease up on the all-caps." };
  }

  const folded = foldForMatch(body);
  if (hasBlockedLanguage(folded)) {
    return { ok: false, error: FRIENDLY_REJECT };
  }

  return { ok: true, body };
}
