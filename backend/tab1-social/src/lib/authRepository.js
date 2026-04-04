import bcrypt from "bcryptjs";

import {
  checkCognitoLogin,
  confirmCognitoOtp,
  isCognitoOtpEnabled,
  registerCognitoOtp,
  resendCognitoOtp,
  updateCognitoProfile
} from "./cognitoOtp.js";
import { withTransaction } from "./db.js";
import { HttpError } from "./errors.js";
import { logWarn } from "./logger.js";
import { hashToken, issueAccessToken, issueRefreshToken, verifyRefreshToken } from "./tokenService.js";

const approvalBypassEmail = "122me0914@nitrkl.ac.in";
const bcryptRounds = Number.parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);

const nitrEmailRegex = /^[^\s@]+@nitrkl\.ac\.in$/i;
const nicknameRegex = /^[a-z0-9._-]{3,30}$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const allowedGenders = new Set(["male", "female", "other"]);

const maxBioLength = 500;
const maxInterestLength = 40;
const maxInterestsCount = 10;

const userSelectColumns = `
      id,
      email,
      cognito_sub,
      email_verified,
      otp_verified_at,
      full_name,
      nickname,
      birth_date,
      gender,
      bio,
      interests,
      display_name,
      branch,
      approval_status,
      is_admin,
      approved_at,
      rejected_at,
      rejection_reason,
      created_at
`;

const userSelectColumnsWithPassword = `
      id,
      email,
      password_hash,
      cognito_sub,
      email_verified,
      otp_verified_at,
      full_name,
      nickname,
      birth_date,
      gender,
      bio,
      interests,
      display_name,
      branch,
      approval_status,
      is_admin,
      approved_at,
      rejected_at,
      rejection_reason,
      created_at
`;

const mapAuthDbError = (error) => {
  if (error instanceof HttpError) {
    return error;
  }

  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message : "";

  if (/connection timeout|connect timeout|timed out/i.test(message)) {
    return new HttpError(
      503,
      "Database connection timed out. Check Lambda VPC/subnet routing and Aurora security groups.",
      "DB_UNAVAILABLE"
    );
  }

  if (code === "3D000") {
    return new HttpError(
      503,
      "Configured database does not exist. Check DATABASE_URL database name.",
      "DB_UNAVAILABLE"
    );
  }

  if (code === "28P01") {
    return new HttpError(
      503,
      "Database authentication failed. Check DATABASE_URL username/password.",
      "DB_UNAVAILABLE"
    );
  }

  if (code === "42501") {
    return new HttpError(
      503,
      "Database user lacks required permissions for auth schema/tables.",
      "DB_UNAVAILABLE"
    );
  }

  if (code === "53300") {
    return new HttpError(
      503,
      "Database has reached connection limit. Try again shortly.",
      "DB_UNAVAILABLE"
    );
  }

  if (code === "42P01") {
    return new HttpError(
      503,
      "Auth tables are missing. Run migrations 002_auth_and_admin.sql through 006_admin_bypass_and_auth_profile_sync.sql.",
      "AUTH_SCHEMA_OUTDATED"
    );
  }

  if (code === "42703" || code === "42883") {
    return new HttpError(
      503,
      "Auth schema is incomplete for current backend version. Apply migrations through 006_admin_bypass_and_auth_profile_sync.sql.",
      "AUTH_SCHEMA_OUTDATED"
    );
  }

  if (
    code === "08001" ||
    code === "08006" ||
    code === "57P03" ||
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT"
  ) {
    return new HttpError(
      503,
      "Database connection failed. Check DATABASE_URL, VPC/subnet routing, and security groups.",
      "DB_UNAVAILABLE"
    );
  }

  return null;
};

const rethrowAuthDbError = (error) => {
  const mapped = mapAuthDbError(error);
  if (mapped) {
    throw mapped;
  }

  throw error;
};

const toBirthDateString = (value) => {
  if (!value) {
    return "2000-01-01";
  }

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return "2000-01-01";
};

const mapUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.full_name ?? row.display_name,
  nickname: row.nickname ?? row.display_name,
  branch: row.branch,
  birthDate: toBirthDateString(row.birth_date),
  gender: row.gender ?? "other",
  bio: row.bio ?? null,
  interests: Array.isArray(row.interests) ? row.interests : [],
  emailVerified: Boolean(row.email_verified),
  otpVerifiedAt: row.otp_verified_at ? new Date(row.otp_verified_at).toISOString() : null,
  approvalStatus: row.approval_status,
  isAdmin: Boolean(row.is_admin),
  approvedAt: row.approved_at ? new Date(row.approved_at).toISOString() : null,
  rejectedAt: row.rejected_at ? new Date(row.rejected_at).toISOString() : null,
  rejectionReason: row.rejection_reason ?? null,
  createdAt: new Date(row.created_at).toISOString()
});

const normalizeEmail = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

const normalizeName = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeNickname = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
};

const normalizeBirthDate = (value) => {
  if (typeof value !== "string") {
    throw new HttpError(400, "birthDate is required", "INVALID_BIRTH_DATE");
  }

  const trimmed = value.trim();
  if (!birthDateRegex.test(trimmed)) {
    throw new HttpError(400, "birthDate must be YYYY-MM-DD", "INVALID_BIRTH_DATE");
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== trimmed) {
    throw new HttpError(400, "birthDate is invalid", "INVALID_BIRTH_DATE");
  }

  return trimmed;
};

const normalizeGender = (value) => {
  if (typeof value !== "string") {
    throw new HttpError(400, "gender is required", "INVALID_GENDER");
  }

  const normalized = value.trim().toLowerCase();
  if (!allowedGenders.has(normalized)) {
    throw new HttpError(400, "gender must be male, female, or other", "INVALID_GENDER");
  }

  return normalized;
};

const normalizeBio = (value, { allowUndefined = true } = {}) => {
  if (value === undefined) {
    if (allowUndefined) {
      return null;
    }

    throw new HttpError(400, "bio must be a string or null", "INVALID_BIO");
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new HttpError(400, "bio must be a string or null", "INVALID_BIO");
  }

  const normalized = value.trim();
  if (!normalized.length) {
    return null;
  }

  if (normalized.length > maxBioLength) {
    throw new HttpError(400, `bio must be at most ${maxBioLength} characters`, "INVALID_BIO");
  }

  return normalized;
};

const normalizeInterests = (value, { defaultEmpty = true } = {}) => {
  if (value === undefined) {
    if (defaultEmpty) {
      return [];
    }

    throw new HttpError(400, "interests must be an array of strings", "INVALID_INTERESTS");
  }

  if (!Array.isArray(value)) {
    throw new HttpError(400, "interests must be an array of strings", "INVALID_INTERESTS");
  }

  const seen = new Set();
  const normalized = [];

  for (const item of value) {
    if (typeof item !== "string") {
      throw new HttpError(400, "interests must be an array of strings", "INVALID_INTERESTS");
    }

    const candidate = item.trim();
    if (!candidate.length) {
      continue;
    }

    if (candidate.length > maxInterestLength) {
      throw new HttpError(
        400,
        `each interest must be at most ${maxInterestLength} characters`,
        "INVALID_INTERESTS"
      );
    }

    const key = candidate.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(candidate);
  }

  if (normalized.length > maxInterestsCount) {
    throw new HttpError(
      400,
      `interests can include at most ${maxInterestsCount} entries`,
      "INVALID_INTERESTS"
    );
  }

  return normalized;
};

const normalizeBranch = (value) => {
  if (typeof value !== "string") {
    return "NITR";
  }

  const branch = value.trim();
  return branch.length ? branch : "NITR";
};

const normalizeProfileName = (value) => {
  if (typeof value !== "string") {
    throw new HttpError(400, "name must be a string", "INVALID_NAME");
  }

  const normalized = normalizeName(value);
  if (normalized.length < 2 || normalized.length > 80) {
    throw new HttpError(400, "name must be between 2 and 80 characters", "INVALID_NAME");
  }

  return normalized;
};

const normalizeProfileNickname = (value) => {
  if (typeof value !== "string") {
    throw new HttpError(400, "nickname must be a string", "INVALID_NICKNAME");
  }

  const normalized = normalizeNickname(value);
  if (!nicknameRegex.test(normalized)) {
    throw new HttpError(
      400,
      "nickname must be 3-30 chars and include only lowercase letters, numbers, dot, dash, underscore",
      "INVALID_NICKNAME"
    );
  }

  return normalized;
};

const normalizeProfileBranch = (value) => {
  if (typeof value !== "string") {
    throw new HttpError(400, "branch must be a string", "INVALID_BRANCH");
  }

  const branch = value.trim();
  if (!branch.length || branch.length > 50) {
    throw new HttpError(400, "branch must be 1-50 characters", "INVALID_BRANCH");
  }

  return branch;
};

const validatePassword = (password) => {
  if (typeof password !== "string") {
    throw new HttpError(400, "password is required", "INVALID_PASSWORD");
  }

  const trimmed = password.trim();
  if (trimmed.length < 8 || trimmed.length > 72) {
    throw new HttpError(400, "password must be 8-72 characters", "INVALID_PASSWORD");
  }

  if (!/[a-z]/.test(trimmed) || !/[A-Z]/.test(trimmed) || !/\d/.test(trimmed)) {
    throw new HttpError(
      400,
      "password must include uppercase, lowercase, and number",
      "INVALID_PASSWORD"
    );
  }

  return trimmed;
};

const validateRegistrationInput = ({
  email,
  password,
  name,
  nickname,
  birthDate,
  gender,
  branch,
  bio,
  interests
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new HttpError(400, "email is required", "INVALID_EMAIL");
  }

  if (!nitrEmailRegex.test(normalizedEmail)) {
    throw new HttpError(400, "Only @nitrkl.ac.in email addresses are allowed", "INVALID_EMAIL");
  }

  const normalizedName = normalizeName(name);
  if (normalizedName.length < 2 || normalizedName.length > 80) {
    throw new HttpError(400, "name must be between 2 and 80 characters", "INVALID_NAME");
  }

  const normalizedNickname = normalizeNickname(nickname);
  if (!nicknameRegex.test(normalizedNickname)) {
    throw new HttpError(
      400,
      "nickname must be 3-30 chars and include only lowercase letters, numbers, dot, dash, underscore",
      "INVALID_NICKNAME"
    );
  }

  const normalizedBranch = normalizeBranch(branch);
  if (normalizedBranch.length > 50) {
    throw new HttpError(400, "branch must be at most 50 characters", "INVALID_BRANCH");
  }

  return {
    email: normalizedEmail,
    name: normalizedName,
    nickname: normalizedNickname,
    birthDate: normalizeBirthDate(birthDate),
    gender: normalizeGender(gender),
    bio: normalizeBio(bio),
    interests: normalizeInterests(interests),
    branch: normalizedBranch,
    password: validatePassword(password)
  };
};

const validateLoginInput = ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !nitrEmailRegex.test(normalizedEmail)) {
    throw new HttpError(400, "email is invalid", "INVALID_EMAIL");
  }

  if (typeof password !== "string" || !password.length) {
    throw new HttpError(400, "password is required", "INVALID_PASSWORD");
  }

  return {
    email: normalizedEmail,
    password
  };
};

const validateOtpInput = ({ email, code }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !nitrEmailRegex.test(normalizedEmail)) {
    throw new HttpError(400, "email is invalid", "INVALID_EMAIL");
  }

  const normalizedCode = typeof code === "string" ? code.trim() : "";
  if (!normalizedCode || normalizedCode.length < 4 || normalizedCode.length > 8) {
    throw new HttpError(400, "OTP code is invalid", "INVALID_OTP_CODE");
  }

  return {
    email: normalizedEmail,
    code: normalizedCode
  };
};

const validateEmailInput = ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !nitrEmailRegex.test(normalizedEmail)) {
    throw new HttpError(400, "email is invalid", "INVALID_EMAIL");
  }

  return {
    email: normalizedEmail
  };
};

const validateProfilePatchInput = (input = {}) => {
  const immutableFieldKeys = ["email", "gender", "birthDate", "birthdate", "birth_date"];

  for (const field of immutableFieldKeys) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      throw new HttpError(
        400,
        `${field} cannot be updated from profile`,
        "IMMUTABLE_PROFILE_FIELD"
      );
    }
  }

  const hasName = Object.prototype.hasOwnProperty.call(input, "name");
  const hasNickname = Object.prototype.hasOwnProperty.call(input, "nickname");
  const hasBranch = Object.prototype.hasOwnProperty.call(input, "branch");
  const hasBio = Object.prototype.hasOwnProperty.call(input, "bio");
  const hasInterests = Object.prototype.hasOwnProperty.call(input, "interests");

  if (!hasName && !hasNickname && !hasBranch && !hasBio && !hasInterests) {
    throw new HttpError(
      400,
      "Provide one of name, nickname, branch, bio, or interests to update profile",
      "INVALID_PROFILE_PATCH"
    );
  }

  const patch = {};

  if (hasName) {
    patch.name = normalizeProfileName(input.name);
  }

  if (hasNickname) {
    patch.nickname = normalizeProfileNickname(input.nickname);
  }

  if (hasBranch) {
    patch.branch = normalizeProfileBranch(input.branch);
  }

  if (hasBio) {
    patch.bio = normalizeBio(input.bio, { allowUndefined: false });
  }

  if (hasInterests) {
    patch.interests = normalizeInterests(input.interests, { defaultEmpty: false });
  }

  return patch;
};

const createSession = async ({ client, user, context }) => {
  const refresh = issueRefreshToken(user);

  await client.query(
    `
    INSERT INTO auth.refresh_sessions (
      id,
      user_id,
      token_hash,
      expires_at,
      user_agent,
      ip_address
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      refresh.jti,
      user.id,
      hashToken(refresh.token),
      refresh.expiresAt,
      context.userAgent,
      context.ipAddress
    ]
  );

  return {
    accessToken: issueAccessToken(user),
    refreshToken: refresh.token
  };
};

const authPayload = async ({ client, userRow, context }) => {
  const user = mapUser(userRow);
  const tokens = await createSession({
    client,
    user,
    context
  });

  return {
    user,
    tokens
  };
};

const findUserByEmail = async (client, email) => {
  const result = await client.query(
    `
    SELECT
${userSelectColumnsWithPassword}
    FROM auth.users
    WHERE email = $1
    LIMIT 1
    `,
    [email]
  );

  return result.rows[0] ?? null;
};

const findUserByNickname = async (client, nickname) => {
  const result = await client.query(
    `
    SELECT
${userSelectColumns}
    FROM auth.users
    WHERE nickname = $1
    LIMIT 1
    `,
    [nickname]
  );

  return result.rows[0] ?? null;
};

export const registerUser = async ({
  email,
  password,
  name,
  nickname,
  birthDate,
  gender,
  bio,
  interests,
  branch,
  context
}) => {
  const valid = validateRegistrationInput({
    email,
    password,
    name,
    nickname,
    birthDate,
    gender,
    bio,
    interests,
    branch
  });
  const otpEnabled = isCognitoOtpEnabled();

  let existing;
  try {
    existing = await withTransaction(async (client) => {
      const byEmail = await findUserByEmail(client, valid.email);
      if (byEmail) {
        return {
          kind: "email",
          row: byEmail
        };
      }

      const byNickname = await findUserByNickname(client, valid.nickname);
      if (byNickname) {
        return {
          kind: "nickname",
          row: byNickname
        };
      }

      return null;
    });
  } catch (error) {
    rethrowAuthDbError(error);
  }

  if (existing) {
    if (existing.kind === "email" && otpEnabled && !existing.row.email_verified) {
      return {
        otpRequired: true,
        email: valid.email,
        delivery: null,
        message: "Account already exists. Complete OTP verification or request a new OTP."
      };
    }

    if (existing.kind === "nickname") {
      throw new HttpError(409, "Nickname is already taken", "NICKNAME_EXISTS");
    }

    throw new HttpError(409, "An account with this email already exists", "EMAIL_EXISTS");
  }

  const cognitoResult = otpEnabled
    ? await registerCognitoOtp({
        email: valid.email,
        password: valid.password,
        name: valid.name,
        nickname: valid.nickname,
        birthDate: valid.birthDate,
        gender: valid.gender
      })
    : null;

  try {
    return await withTransaction(async (client) => {
      const isAdmin = valid.email === approvalBypassEmail;
      const approvalStatus = isAdmin ? "approved" : "pending";
      const passwordHash = await bcrypt.hash(valid.password, bcryptRounds);
      const emailVerified = !otpEnabled;

      const insertResult = await client.query(
        `
      INSERT INTO auth.users (
        email,
        password_hash,
        cognito_sub,
        email_verified,
        otp_verified_at,
        full_name,
        nickname,
        display_name,
        birth_date,
        gender,
        bio,
        interests,
        branch,
        approval_status,
        is_admin,
        approved_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4::boolean,
        CASE WHEN $4::boolean THEN now() ELSE NULL END,
        $5,
        $6,
        $7,
        $8::date,
        $9,
        $10,
        $11::text[],
        $12,
        $13,
        $14::boolean,
        CASE WHEN $14::boolean THEN now() ELSE NULL END
      )
      RETURNING
${userSelectColumns}
      `,
        [
          valid.email,
          passwordHash,
          cognitoResult?.cognitoSub ?? null,
          emailVerified,
          valid.name,
          valid.nickname,
          valid.nickname,
          valid.birthDate,
          valid.gender,
          valid.bio,
          valid.interests,
          valid.branch,
          approvalStatus,
          isAdmin
        ]
      );

      if (otpEnabled) {
        return {
          otpRequired: true,
          email: valid.email,
          delivery: cognitoResult?.delivery ?? null,
          message: "OTP sent. Verify your email before login."
        };
      }

      return authPayload({
        client,
        userRow: insertResult.rows[0],
        context
      });
    });
  } catch (error) {
    logWarn(
      "User registration transaction failed",
      {
        file: "backend/tab1-social/src/lib/authRepository.js",
        location: "registerUser",
        action: "insert auth user and session",
        details: {
          email: valid.email,
          nickname: valid.nickname,
          otpEnabled
        }
      },
      error
    );

    if (error?.code === "23505") {
      const detail = String(error?.detail ?? "");

      if (detail.includes("(nickname)")) {
        throw new HttpError(409, "Nickname is already taken", "NICKNAME_EXISTS");
      }

      if (detail.includes("(email)")) {
        throw new HttpError(409, "An account with this email already exists", "EMAIL_EXISTS");
      }
    }

    rethrowAuthDbError(error);
  }
};

export const loginUser = async ({ email, password, context }) => {
  const valid = validateLoginInput({ email, password });

  try {
    return await withTransaction(async (client) => {
      const userRow = await findUserByEmail(client, valid.email);

      if (!userRow) {
        throw new HttpError(404, "Account does not exist", "USER_NOT_FOUND");
      }

      const otpEnabled = isCognitoOtpEnabled();
      let shouldValidateLocalPassword = !otpEnabled;

      if (otpEnabled) {
        // Authenticate directly against Cognito to inherit user disabled status and email verification
        try {
          await checkCognitoLogin({ email: valid.email, password: valid.password });
          shouldValidateLocalPassword = false;
        } catch (error) {
          if (error instanceof HttpError && error.code === "ACCOUNT_DISABLED") {
            // Treat as login success but mark them as rejected so frontend routes to pending/rejected screen
            userRow.approval_status = "rejected";
            userRow.rejection_reason = "Account disabled in Cognito";
            shouldValidateLocalPassword = false;
          } else if (
            error instanceof HttpError &&
            error.code === "COGNITO_AUTH_FLOW_NOT_ENABLED"
          ) {
            // Do not hard-fail login for app-client auth-flow mismatch; rely on local password hash as fallback.
            logWarn(
              "Cognito auth flow not enabled; using local password validation fallback",
              {
                file: "backend/tab1-social/src/lib/authRepository.js",
                location: "loginUser",
                action: "fallback to bcrypt compare",
                details: {
                  email: valid.email
                }
              },
              error
            );

            shouldValidateLocalPassword = true;
          } else {
            throw error;
          }
        }
      }

      if (!userRow.email_verified) {
        throw new HttpError(
          403,
          "OTP verification required before login",
          "OTP_VERIFICATION_REQUIRED"
        );
      }

      if (shouldValidateLocalPassword) {
        const isPasswordValid = await bcrypt.compare(valid.password, userRow.password_hash);
        if (!isPasswordValid) {
          throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
        }
      }

      // Instead of blocking login for rejected users, we allow them to receive a token.
      // The frontend route guards will enforce they can only see the Pending/Rejected screen.
      
      await client.query(
        `
      UPDATE auth.users
      SET last_login_at = now()
      WHERE id = $1
      `,
        [userRow.id]
      );

      return authPayload({
        client,
        userRow,
        context
      });
    });
  } catch (error) {
    rethrowAuthDbError(error);
  }
};

export const getUserById = async ({ userId }) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `
      SELECT
${userSelectColumns}
      FROM auth.users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (!result.rowCount) {
      throw new HttpError(401, "User not found", "USER_NOT_FOUND");
    }

    return mapUser(result.rows[0]);
  }).catch((error) => {
    rethrowAuthDbError(error);
  });

export const refreshTokens = async ({ refreshToken, context }) => {
  if (typeof refreshToken !== "string" || !refreshToken.trim()) {
    throw new HttpError(400, "refreshToken is required", "INVALID_REFRESH_TOKEN");
  }

  const decoded = verifyRefreshToken(refreshToken.trim());

  try {
    return await withTransaction(async (client) => {
      const sessionResult = await client.query(
        `
      SELECT id, user_id, token_hash, expires_at, revoked_at
      FROM auth.refresh_sessions
      WHERE id = $1
      LIMIT 1
      `,
        [decoded.jti]
      );

      const session = sessionResult.rows[0];
      if (!session || session.revoked_at || hashToken(refreshToken.trim()) !== session.token_hash) {
        throw new HttpError(401, "Refresh session is invalid", "INVALID_REFRESH_TOKEN");
      }

      if (new Date(session.expires_at).getTime() <= Date.now()) {
        throw new HttpError(401, "Refresh session expired", "REFRESH_TOKEN_EXPIRED");
      }

      const userResult = await client.query(
        `
      SELECT
${userSelectColumns}
      FROM auth.users
      WHERE id = $1
      LIMIT 1
      `,
        [decoded.userId]
      );

      if (!userResult.rowCount) {
        throw new HttpError(401, "User not found", "USER_NOT_FOUND");
      }

      await client.query(
        `
      UPDATE auth.refresh_sessions
      SET revoked_at = now()
      WHERE id = $1
      `,
        [decoded.jti]
      );

      return authPayload({
        client,
        userRow: userResult.rows[0],
        context
      });
    });
  } catch (error) {
    rethrowAuthDbError(error);
  }
};

export const revokeRefreshSession = async ({ refreshToken }) => {
  if (typeof refreshToken !== "string" || !refreshToken.trim()) {
    return;
  }

  const decoded = verifyRefreshToken(refreshToken.trim());

  await withTransaction(async (client) => {
    await client.query(
      `
      UPDATE auth.refresh_sessions
      SET revoked_at = now()
      WHERE id = $1
        AND revoked_at IS NULL
      `,
      [decoded.jti]
    );
  });
};

export const listPendingApprovals = async () =>
  withTransaction(async (client) => {
    const result = await client.query(
      `
      SELECT
${userSelectColumns}
      FROM auth.users
      WHERE approval_status = 'pending'
      ORDER BY created_at ASC
      `
    );

    return result.rows.map(mapUser);
  }).catch((error) => {
    rethrowAuthDbError(error);
  });

export const approveUser = async ({ adminUserId, userId }) =>
  withTransaction(async (client) => {
    const result = await client.query(
      `
      UPDATE auth.users
      SET
        approval_status = 'approved',
        approved_at = now(),
        approved_by = $1,
        rejected_at = NULL,
        rejection_reason = NULL,
        updated_at = now()
      WHERE id = $2
        AND approval_status <> 'approved'
      RETURNING
${userSelectColumns}
      `,
      [adminUserId, userId]
    );

    if (!result.rowCount) {
      throw new HttpError(404, "Pending user not found", "USER_NOT_FOUND");
    }

    return mapUser(result.rows[0]);
  }).catch((error) => {
    rethrowAuthDbError(error);
  });

export const rejectUser = async ({ adminUserId, userId, reason }) => {
  const rejectionReason =
    typeof reason === "string" && reason.trim().length
      ? reason.trim().slice(0, 500)
      : "Rejected by admin";

  try {
    return await withTransaction(async (client) => {
      const result = await client.query(
        `
      UPDATE auth.users
      SET
        approval_status = 'rejected',
        rejected_at = now(),
        rejected_by = $1,
        rejection_reason = $3,
        updated_at = now()
      WHERE id = $2
        AND approval_status <> 'rejected'
      RETURNING
${userSelectColumns}
      `,
        [adminUserId, userId, rejectionReason]
      );

      if (!result.rowCount) {
        throw new HttpError(404, "User not found", "USER_NOT_FOUND");
      }

      return mapUser(result.rows[0]);
    });
  } catch (error) {
    rethrowAuthDbError(error);
  }
};

export const verifyUserOtp = async ({ email, code }) => {
  const valid = validateOtpInput({ email, code });

  if (!isCognitoOtpEnabled()) {
    throw new HttpError(400, "Cognito OTP is disabled", "COGNITO_OTP_DISABLED");
  }

  await confirmCognitoOtp({
    email: valid.email,
    code: valid.code
  });

  try {
    return await withTransaction(async (client) => {
      const updateResult = await client.query(
        `
      UPDATE auth.users
      SET
        email_verified = true,
        otp_verified_at = COALESCE(otp_verified_at, now()),
        updated_at = now()
      WHERE email = $1
      RETURNING
${userSelectColumns}
      `,
        [valid.email]
      );

      if (!updateResult.rowCount) {
        throw new HttpError(404, "User not found", "USER_NOT_FOUND");
      }

      return {
        verified: true,
        user: mapUser(updateResult.rows[0])
      };
    });
  } catch (error) {
    rethrowAuthDbError(error);
  }
};

export const resendUserOtp = async ({ email }) => {
  const valid = validateEmailInput({ email });

  if (!isCognitoOtpEnabled()) {
    throw new HttpError(400, "Cognito OTP is disabled", "COGNITO_OTP_DISABLED");
  }

  const result = await resendCognitoOtp({
    email: valid.email
  });

  return {
    sent: true,
    email: valid.email,
    delivery: result.delivery
  };
};

export const updateUserProfile = async ({
  userId,
  name,
  nickname,
  branch,
  bio,
  interests,
  email,
  gender,
  birthDate,
  birthdate,
  birth_date
}) => {
  const patch = validateProfilePatchInput({
    name,
    nickname,
    branch,
    bio,
    interests,
    email,
    gender,
    birthDate,
    birthdate,
    birth_date
  });

  try {
    return await withTransaction(async (client) => {
      const currentUserResult = await client.query(
        `
      SELECT
${userSelectColumns}
      FROM auth.users
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
      `,
        [userId]
      );

      if (!currentUserResult.rowCount) {
        throw new HttpError(404, "User not found", "USER_NOT_FOUND");
      }

      const currentUser = currentUserResult.rows[0];
      const nextName =
        Object.prototype.hasOwnProperty.call(patch, "name")
          ? patch.name
          : currentUser.full_name;
      const nextNickname =
        Object.prototype.hasOwnProperty.call(patch, "nickname")
          ? patch.nickname
          : currentUser.nickname;

      const shouldSyncCognito =
        isCognitoOtpEnabled() &&
        (nextName !== currentUser.full_name || nextNickname !== currentUser.nickname);

      if (shouldSyncCognito) {
        await updateCognitoProfile({
          email: currentUser.email,
          name: nextName,
          nickname: nextNickname
        });
      }

      const updates = [];
      const values = [userId];

      if (Object.prototype.hasOwnProperty.call(patch, "name")) {
        updates.push(`full_name = $${values.length + 1}`);
        values.push(patch.name);
      }

      if (Object.prototype.hasOwnProperty.call(patch, "nickname")) {
        const nicknameParam = values.length + 1;
        updates.push(`nickname = $${nicknameParam}`);
        updates.push(`display_name = $${nicknameParam}`);
        values.push(patch.nickname);
      }

      if (Object.prototype.hasOwnProperty.call(patch, "branch")) {
        updates.push(`branch = $${values.length + 1}`);
        values.push(patch.branch);
      }

      if (Object.prototype.hasOwnProperty.call(patch, "bio")) {
        updates.push(`bio = $${values.length + 1}`);
        values.push(patch.bio);
      }

      if (Object.prototype.hasOwnProperty.call(patch, "interests")) {
        updates.push(`interests = $${values.length + 1}::text[]`);
        values.push(patch.interests);
      }

      updates.push("updated_at = now()");

      const result = await client.query(
        `
      UPDATE auth.users
      SET
        ${updates.join(",\n        ")}
      WHERE id = $1
      RETURNING
${userSelectColumns}
      `,
        values
      );

      if (!result.rowCount) {
        throw new HttpError(404, "User not found", "USER_NOT_FOUND");
      }

      return mapUser(result.rows[0]);
    });
  } catch (error) {
    if (error?.code === "23505") {
      const detail = String(error?.detail ?? "");
      if (detail.includes("(nickname)")) {
        throw new HttpError(409, "Nickname is already taken", "NICKNAME_EXISTS");
      }
    }

    rethrowAuthDbError(error);
  }
};
