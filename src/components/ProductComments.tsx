"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";

export type ProductCommentView = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  authorName: string;
  authorImage: string | null;
};

export function ProductComments({
  productId,
  productSlug,
  initialComments,
  signedIn,
  currentUserId,
  isStaff = false,
}: {
  productId: string;
  productSlug: string;
  initialComments: ProductCommentView[];
  signedIn: boolean;
  currentUserId?: string | null;
  isStaff?: boolean;
}) {
  const router = useRouter();
  const loginHref = `/login?next=${encodeURIComponent(`/build/${productSlug}`)}`;
  const signupHref = `/signup?next=${encodeURIComponent(`/build/${productSlug}`)}`;
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!signedIn) {
      router.push(loginHref);
      return;
    }
    const trimmed = body.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, body: trimmed }),
      });
      const data = (await response.json()) as {
        comment?: ProductCommentView;
        error?: string;
      };
      if (response.status === 401) {
        router.push(loginHref);
        return;
      }
      if (!response.ok || !data.comment) {
        throw new Error(data.error || "Could not post comment");
      }
      setComments((prev) => [data.comment!, ...prev]);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(commentId: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not delete");
      setComments((prev) => prev.filter((item) => item.id !== commentId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 space-y-6 border-t border-white/15 pt-10">
      <div>
        <h2 className="font-display text-3xl tracking-[0.08em] text-white">
          COMMENTS
        </h2>
        <p className="mt-2 text-sm text-white/55">
          {comments.length} comment{comments.length === 1 ? "" : "s"} · signed-in
          accounts can post
        </p>
      </div>

      {signedIn ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block space-y-2 text-sm">
            <span className="text-white/70">Add a comment</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Ask a question or share build tips…"
              className="w-full border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-brand-orange"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className="bg-brand-orange px-5 py-3 text-sm font-bold tracking-[0.14em] text-white disabled:opacity-50"
            >
              {busy ? "POSTING…" : "POST COMMENT"}
            </button>
            <span className="text-xs text-white/40">{body.length}/2000</span>
          </div>
        </form>
      ) : (
        <p className="border border-white/15 px-4 py-3 text-sm text-white/65">
          <Link href={loginHref} className="text-brand-orange hover:underline">
            Log in
          </Link>{" "}
          or{" "}
          <Link href={signupHref} className="text-brand-orange hover:underline">
            create an account
          </Link>{" "}
          to comment on this MOC.
        </p>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <ul className="space-y-4">
        {comments.length === 0 ? (
          <li className="text-sm text-white/45">
            No comments yet. Be the first to leave one.
          </li>
        ) : (
          comments.map((comment) => {
            const canDelete =
              Boolean(currentUserId) &&
              (comment.userId === currentUserId || isStaff);
            return (
              <li
                key={comment.id}
                className="border border-white/10 px-4 py-4 text-sm text-white/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={comment.authorName}
                      image={comment.authorImage}
                      size={36}
                    />
                    <div>
                      <p className="font-semibold text-white">
                        {comment.authorName}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(comment.id)}
                      className="text-xs tracking-[0.1em] text-white/40 hover:text-red-300"
                    >
                      DELETE
                    </button>
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed">
                  {comment.body}
                </p>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
