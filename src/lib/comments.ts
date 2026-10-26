import { prisma } from "@/lib/prisma";

export const COMMENT_MAX_LENGTH = 1000;
export const COMMENT_MIN_LENGTH = 1;
export const COMMENT_COOLDOWN_MS = 8000;

export const commentAuthorSelect = {
  id: true,
  name: true,
  avatarMime: true,
  updatedAt: true,
} as const;

export type CommentAuthorRecord = {
  id: string;
  name: string;
  avatarMime: string | null;
  updatedAt: Date;
};

export type CommentRecord = {
  id: string;
  body: string;
  createdAt: Date;
  user: CommentAuthorRecord;
};

export type CommentAuthorView = {
  id: string;
  name: string;
  image: string | null;
};

export type CommentView = {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthorView;
};

let commentsTableReady: Promise<void> | null = null;

/** Create the comments table if migrate deploy could not run on Vercel. */
export function ensureCommentsTable() {
  if (!commentsTableReady) {
    commentsTableReady = prisma
      .$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "ProductComment" (
          "id" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "body" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProductComment_pkey" PRIMARY KEY ("id")
        )`,
      )
      .then(async () => {
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "ProductComment_productId_createdAt_idx" ON "ProductComment"("productId", "createdAt")`,
        );
        await prisma.$executeRawUnsafe(
          `CREATE INDEX IF NOT EXISTS "ProductComment_userId_idx" ON "ProductComment"("userId")`,
        );
      })
      .catch((error) => {
        commentsTableReady = null;
        throw error;
      })
      .then(() => undefined);
  }
  return commentsTableReady;
}

export function commentAuthorImage(user: CommentAuthorRecord): string | null {
  if (!user.avatarMime) return null;
  return `/api/avatars/${user.id}?v=${user.updatedAt.getTime()}`;
}

export function toCommentView(comment: CommentRecord): CommentView {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: comment.user.id,
      name: comment.user.name,
      image: commentAuthorImage(comment.user),
    },
  };
}
