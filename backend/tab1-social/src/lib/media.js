import crypto from "node:crypto";

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { HttpError } from "./errors.js";
import { logWarn } from "./logger.js";

const region = process.env.AWS_REGION ?? "ap-south-1";
const s3 = new S3Client({ region });

const maxSignedReadUrlTtlSeconds = 24 * 60 * 60;
const minSignedReadUrlTtlSeconds = 60;

const sanitizeFileName = (fileName) =>
  fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

const normalizePublicBaseUrl = (publicBaseUrl) => {
  const trimmed = typeof publicBaseUrl === "string" ? publicBaseUrl.trim() : "";
  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "");
  }

  return `https://${trimmed}`.replace(/\/+$/, "");
};

const extractS3ObjectKey = ({ uri, bucket }) => {
  const trimmedUri = typeof uri === "string" ? uri.trim() : "";
  if (!trimmedUri) {
    return null;
  }

  if (!/^https?:\/\//i.test(trimmedUri)) {
    if (trimmedUri.startsWith("social/")) {
      return trimmedUri.replace(/^\/+/, "");
    }

    return null;
  }

  try {
    const parsed = new URL(trimmedUri);
    const normalizedHost = parsed.hostname.toLowerCase();
    const normalizedPath = parsed.pathname.replace(/^\/+/, "");
    const normalizedBucket = bucket.toLowerCase();
    const normalizedRegion = region.toLowerCase();

    const virtualHostRegional = `${normalizedBucket}.s3.${normalizedRegion}.amazonaws.com`;
    const virtualHostGlobal = `${normalizedBucket}.s3.amazonaws.com`;
    if (normalizedHost === virtualHostRegional || normalizedHost === virtualHostGlobal) {
      return normalizedPath;
    }

    const pathStyleRegional = `s3.${normalizedRegion}.amazonaws.com`;
    if (normalizedHost === "s3.amazonaws.com" || normalizedHost === pathStyleRegional) {
      const [bucketFromPath, ...restPath] = normalizedPath.split("/");
      if (bucketFromPath?.toLowerCase() === normalizedBucket && restPath.length > 0) {
        return restPath.join("/");
      }
    }
  } catch {
    return null;
  }

  return null;
};

const resolveSignedReadUrlTtl = () => {
  const configuredTtl = Number.parseInt(process.env.SOCIAL_MEDIA_READ_URL_EXPIRES_IN ?? "3600", 10);
  if (!Number.isFinite(configuredTtl)) {
    return 3600;
  }

  return Math.min(
    maxSignedReadUrlTtlSeconds,
    Math.max(minSignedReadUrlTtlSeconds, configuredTtl)
  );
};

export const createMediaUploadUrl = async ({ userId, fileName, mimeType, mediaType }) => {
  const bucket = process.env.SOCIAL_MEDIA_BUCKET;

  if (!bucket) {
    throw new HttpError(500, "SOCIAL_MEDIA_BUCKET is required", "MISSING_MEDIA_BUCKET");
  }

  if (mediaType !== "image" && mediaType !== "video") {
    throw new HttpError(400, "mediaType must be image or video", "INVALID_MEDIA_TYPE");
  }

  if (!fileName?.trim()) {
    throw new HttpError(400, "fileName is required", "INVALID_FILENAME");
  }

  const safeFileName = sanitizeFileName(fileName.trim());
  const datePrefix = new Date().toISOString().slice(0, 10);
  const key = `social/${userId}/${datePrefix}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

  const putObjectCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType ?? "application/octet-stream",
    Metadata: {
      uploadedBy: userId,
      mediaType
    }
  });

  const expiresIn = 900;
  const uploadUrl = await getSignedUrl(s3, putObjectCommand, { expiresIn });

  const publicBaseUrl = normalizePublicBaseUrl(process.env.SOCIAL_MEDIA_PUBLIC_BASE_URL);
  const publicUrl = publicBaseUrl
    ? `${publicBaseUrl}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return {
    key,
    uploadUrl,
    publicUrl,
    expiresIn
  };
};

export const resolveMediaReadUrl = async ({ uri }) => {
  const bucket = process.env.SOCIAL_MEDIA_BUCKET;
  if (!bucket) {
    return uri;
  }

  const normalizedUri = typeof uri === "string" ? uri.trim() : "";
  if (!normalizedUri) {
    return uri;
  }

  const publicBaseUrl = normalizePublicBaseUrl(process.env.SOCIAL_MEDIA_PUBLIC_BASE_URL);
  if (publicBaseUrl && normalizedUri.startsWith(publicBaseUrl)) {
    return normalizedUri;
  }

  const key = extractS3ObjectKey({ uri: normalizedUri, bucket });
  if (!key) {
    return normalizedUri;
  }

  try {
    return await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      }),
      {
        expiresIn: resolveSignedReadUrlTtl()
      }
    );
  } catch (error) {
    logWarn(
      "Failed to create signed read URL; returning stored URI",
      {
        file: "backend/tab1-social/src/lib/media.js",
        location: "resolveMediaReadUrl",
        action: "sign media read URL",
        uri: normalizedUri,
        key
      },
      error
    );

    return normalizedUri;
  }
};
