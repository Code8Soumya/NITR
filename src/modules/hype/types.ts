export type HypeMediaType = "image" | "video";

export type HypeMedia = {
  id: string;
  uri: string;
  mediaType: HypeMediaType;
};

export type HypeComment = {
  id: string;
  postId: string;
  userId: string;
  displayName: string;
  body: string;
  createdAt: string;
};

export type HypePost = {
  id: string;
  userId: string;
  authorName: string;
  authorBranch: string;
  caption: string;
  hashtags: string[];
  createdAt: string;
  hypeCount: number;
  isHypedByMe: boolean;
  media: HypeMedia[];
  comments: HypeComment[];
};

export type FeedQuery = {
  hashtag?: string;
};

export type CreatePostPayload = {
  caption: string;
  media: {
    uri: string;
    mediaType: HypeMediaType;
  }[];
};

export type AddCommentPayload = {
  postId: string;
  body: string;
};
