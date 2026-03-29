import crypto from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { HttpError } from "./errors.js";

const region = process.env.AWS_REGION ?? "ap-south-1";
const s3 = new S3Client({ region });

const sanitizeFileName = (fileName) =>
  fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

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

  const publicBaseUrl = process.env.SOCIAL_MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, "");
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
