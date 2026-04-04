import { type AllowedMediaAspectRatioLabel } from "@/modules/hype/utils/mediaAspectRatio";

export type HypeMediaType = "image" | "video";

export type HypeVideoAudioMode = "forced-muted" | "start-muted" | "start-unmuted";

export type HypeMedia = {
  id: string;
  uri: string;
  mediaType: HypeMediaType;
  aspectRatio?: number;
  aspectRatioLabel?: AllowedMediaAspectRatioLabel;
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
  authorBio?: string;
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
    fileName?: string;
    mimeType?: string;
    aspectRatioLabel?: AllowedMediaAspectRatioLabel;
  }[];
};

export type AddCommentPayload = {
  postId: string;
  body: string;
};
