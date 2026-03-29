import { HttpError } from "./errors.js";

const hashtagRegex = /#[A-Za-z0-9_]+/g;

export const extractHashtags = (caption) => {
  const matches = caption.match(hashtagRegex) ?? [];
  const normalized = matches.map((tag) => tag.toLowerCase());
  return Array.from(new Set(normalized));
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
