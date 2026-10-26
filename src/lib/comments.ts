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
