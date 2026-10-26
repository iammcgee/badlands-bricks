"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import {
  COMMENT_MAX_LENGTH,
  type CommentView,
} from "@/lib/comments";

export function MocComments({
  productId,
  initialComments,
  signedIn,
  currentUserId,
  isStaff,
}: {
  productId: string;
  initialComments: CommentView[];
  signedIn: boolean;
  currentUserId: string | null;
  isStaff: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const next = encodeURIComponent(pathname || "/");
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remaining = COMMENT_MAX_LENGTH - body.length;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) {
      router.push(`/login?next=${next}`);
      return;
    }
    if (posting) return;
    setError("");
    setPosting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, body }),
      });
      const data = (await response.json()) as {
        comment?: CommentView;
        error?: string;
      };

      if (response.status === 401) {
        router.push(`/login?next=${next}`);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not post comment");
      if (!data.comment) throw new Error("Could not post comment");

      setComments((current) => [data.comment!, ...current]);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post comment");
    } finally {
      setPosting(false);
    }
  }

  async function onDelete(commentId: string) {
    if (deletingId) return;
    if (!window.confirm("Delete this comment?")) return;
    setError("");
    setDeletingId(commentId);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (response.status === 401) {
        router.push(`/login?next=${next}`);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not delete comment");
      setComments((current) => current.filter((row) => row.id !== commentId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete comment");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="border-t border-white/10 pt-12">
      <h2 className="font-display text-3xl tracking-[0.08em] text-white md:text-4xl">
        COMMENTS
      </h2>
      <p className="mt-2 text-sm text-white/55">
        {comments.length} comment{comments.length === 1 ? "" : "s"} from the
        Badlands community. Keep it about the build — no photos, slurs, or
        nasty stuff.
      </p>

      {signedIn ? (
        <form onSubmit={onSubmit} className="mt-8 space-y-3">
          <label className="block space-y-2">
            <span className="text-xs tracking-[0.14em] text-white/70">
              WRITE A COMMENT
            </span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              required
              maxLength={COMMENT_MAX_LENGTH}
              rows={4}
              placeholder="What do you think of this build? Text only — keep it civil."
              className="w-full border border-white/25 bg-neutral-900 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-brand-orange"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p
              className={`text-xs ${
                remaining < 40 ? "text-brand-orange" : "text-white/40"
              }`}
            >
              {remaining} left
            </p>
            <button
              type="submit"
              disabled={posting || body.trim().length === 0}
              className="bg-brand-orange px-6 py-3 text-sm font-bold tracking-[0.14em] text-white transition hover:bg-orange-500 disabled:opacity-60"
            >
              {posting ? "POSTING…" : "POST COMMENT"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-8 border border-white/15 bg-white/5 px-4 py-4 text-sm text-white/70">
          <Link href={`/login?next=${next}`} className="text-brand-orange hover:underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link
            href={`/signup?next=${next}`}
            className="text-brand-orange hover:underline"
          >
            create an account
          </Link>{" "}
          to comment on this MOC and give it a like.
        </p>
      )}

      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

      <ul className="mt-10 space-y-6">
        {comments.length === 0 ? (
          <li className="text-sm text-white/50">
            No comments yet. Be the first to leave one.
          </li>
        ) : (
          comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              canDelete={
                Boolean(currentUserId) &&
                (comment.author.id === currentUserId || isStaff)
              }
              deleting={deletingId === comment.id}
              onDelete={() => onDelete(comment.id)}
            />
          ))
        )}
      </ul>
    </section>
  );
}

function CommentRow({
  comment,
  canDelete,
  deleting,
  onDelete,
}: {
  comment: CommentView;
  canDelete: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  const posted = useMemo(
    () => formatCommentTime(comment.createdAt),
    [comment.createdAt],
  );

  return (
    <li className="flex gap-3 border border-white/10 px-4 py-4">
      <UserAvatar
        name={comment.author.name}
        image={comment.author.image}
        size={40}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-white">
            {comment.author.name}
          </p>
          <p className="text-xs text-white/40">{posted}</p>
        </div>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80">
          {comment.body}
        </p>
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="mt-3 text-xs tracking-[0.12em] text-white/45 transition hover:text-brand-orange disabled:opacity-60"
          >
            {deleting ? "DELETING…" : "DELETE"}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function formatCommentTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
