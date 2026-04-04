const ASPECT_RATIO_TOLERANCE = 0.03;

const ALLOWED_ASPECT_RATIO_CONFIG = [
  { label: "9:16", width: 9, height: 16 },
  { label: "16:9", width: 16, height: 9 },
  { label: "3:4", width: 3, height: 4 },
  { label: "4:3", width: 4, height: 3 },
  { label: "1:1", width: 1, height: 1 },
  { label: "4:5", width: 4, height: 5 }
] as const;

export type AllowedMediaAspectRatioLabel =
  (typeof ALLOWED_ASPECT_RATIO_CONFIG)[number]["label"];

export const ALLOWED_MEDIA_ASPECT_RATIO_LABELS = ALLOWED_ASPECT_RATIO_CONFIG.map(
  (entry) => entry.label
);

export const resolveAllowedAspectRatioLabel = (
  width: number,
  height: number
): AllowedMediaAspectRatioLabel | undefined => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return undefined;
  }

  const ratio = width / height;
  let closest: { label: AllowedMediaAspectRatioLabel; delta: number } | undefined;

  for (const candidate of ALLOWED_ASPECT_RATIO_CONFIG) {
    const candidateRatio = candidate.width / candidate.height;
    const delta = Math.abs(ratio - candidateRatio);

    if (delta > ASPECT_RATIO_TOLERANCE) {
      continue;
    }

    if (!closest || delta < closest.delta) {
      closest = {
        label: candidate.label,
        delta
      };
    }
  }

  return closest?.label;
};

export const getAspectRatioValueFromLabel = (label: AllowedMediaAspectRatioLabel): number => {
  const matched = ALLOWED_ASPECT_RATIO_CONFIG.find((entry) => entry.label === label);
  if (!matched) {
    return 4 / 5;
  }

  return matched.width / matched.height;
};

export const getAspectRatioDimensionsFromLabel = (
  label: AllowedMediaAspectRatioLabel
): [number, number] => {
  const matched = ALLOWED_ASPECT_RATIO_CONFIG.find((entry) => entry.label === label);
  if (!matched) {
    return [4, 5];
  }

  return [matched.width, matched.height];
};

export const formatNumericAspectRatio = (width: number, height: number): string => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "unknown";
  }

  return (width / height).toFixed(2);
};
