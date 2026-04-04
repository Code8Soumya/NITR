import { HttpError } from "./errors.js";

const hashtagRegex = /#[A-Za-z0-9_]+/g;
export const MAX_HASHTAGS_PER_POST = 5;

export const extractHashtags = (caption) => {
  const matches = caption.match(hashtagRegex) ?? [];
  const normalized = matches.map((tag) => tag.toLowerCase());
  return Array.from(new Set(normalized));
};

export const validateHashtagCount = (hashtags) => {
  if (!Array.isArray(hashtags)) {
    throw new HttpError(400, "Hashtags must be an array", "INVALID_HASHTAG");
  }

  if (hashtags.length > MAX_HASHTAGS_PER_POST) {
    throw new HttpError(
      400,
      `A post can contain at most ${MAX_HASHTAGS_PER_POST} hashtags`,
      "HASHTAG_LIMIT_EXCEEDED"
    );
  }
};

export const normalizeHashtag = (value) => {
  if (typeof value !== "string") {
    throw new HttpError(400, "Hashtag must be a string", "INVALID_HASHTAG");
  }

  const trimmed = value.trim().toLowerCase();
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (!/^#[a-z0-9_]+$/.test(prefixed)) {
    throw new HttpError(400, "Hashtag format is invalid", "INVALID_HASHTAG");
  }

  return prefixed;
};
