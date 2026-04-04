import crypto from "node:crypto";

import {
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";

import { HttpError } from "./errors.js";
import { logError, logWarn } from "./logger.js";

const otpToggle = (process.env.COGNITO_OTP_ENABLED ?? "false").toLowerCase() === "true";
const cognitoRegion = process.env.COGNITO_REGION ?? process.env.AWS_REGION;
const cognitoClientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
const cognitoClientSecret = process.env.COGNITO_USER_POOL_CLIENT_SECRET;
const cognitoUserPoolId = process.env.COGNITO_USER_POOL_ID;
const parsedCognitoMaxAttempts = Number.parseInt(process.env.COGNITO_MAX_ATTEMPTS ?? "2", 10);
const cognitoMaxAttempts =
  Number.isFinite(parsedCognitoMaxAttempts) && parsedCognitoMaxAttempts > 0
    ? parsedCognitoMaxAttempts
    : 2;

let cognitoClient;

const ensureConfig = () => {
  if (!cognitoRegion || !cognitoClientId) {
    throw new HttpError(
      500,
      "COGNITO_REGION and COGNITO_USER_POOL_CLIENT_ID must be configured",
      "COGNITO_CONFIG_MISSING"
    );
  }
};

const ensureOtpEnabled = () => {
  if (!otpToggle) {
    throw new HttpError(400, "Cognito OTP is disabled", "COGNITO_OTP_DISABLED");
  }
};

const ensureUserPoolConfig = () => {
  ensureConfig();

  if (!cognitoUserPoolId) {
    throw new HttpError(
      500,
      "COGNITO_USER_POOL_ID must be configured for Cognito profile sync",
      "COGNITO_CONFIG_MISSING"
    );
  }
};

const getClient = () => {
  ensureConfig();

  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({
      region: cognitoRegion,
      maxAttempts: cognitoMaxAttempts
    });
  }

  return cognitoClient;
};

const buildSecretHash = (username) => {
  if (!cognitoClientSecret) {
    return undefined;
  }

  return crypto
    .createHmac("sha256", cognitoClientSecret)
    .update(`${username}${cognitoClientId}`)
    .digest("base64");
};

const mapDelivery = (details) => {
  if (!details) {
    return null;
  }

  return {
    destination: details.Destination ?? null,
    medium: details.DeliveryMedium ?? null,
    attributeName: details.AttributeName ?? null
  };
};

const translateCognitoError = (error) => {
  if (error instanceof HttpError) {
    return error;
  }

  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message : "";

  const isNetworkTimeout =
    error?.name === "TimeoutError" ||
    code === "ETIMEDOUT" ||
    /timed out|timeout/i.test(message);

  if (isNetworkTimeout) {
    return new HttpError(
      503,
      "Cognito endpoint is unreachable from Lambda. Configure NAT egress or add a VPC interface endpoint for cognito-idp.",
      "COGNITO_NETWORK_UNAVAILABLE"
    );
  }

  if (
    code === "ENETUNREACH" ||
    code === "ECONNRESET" ||
    code === "EHOSTUNREACH" ||
    code === "EAI_AGAIN"
  ) {
    return new HttpError(
      503,
      "Network path to Cognito failed. Ensure Lambda has outbound HTTPS access to cognito-idp.",
      "COGNITO_NETWORK_UNAVAILABLE"
    );
  }

  switch (error?.name) {
    case "UsernameExistsException":
      return new HttpError(
        409,
        "Account already exists. Use OTP verification or login.",
        "COGNITO_USER_EXISTS"
      );
    case "InvalidPasswordException":
      return new HttpError(400, "Password does not meet Cognito policy", "INVALID_PASSWORD");
    case "CodeMismatchException":
      return new HttpError(400, "Invalid OTP code", "INVALID_OTP_CODE");
    case "ExpiredCodeException":
      return new HttpError(400, "OTP code expired. Request a new code.", "OTP_CODE_EXPIRED");
    case "UserNotFoundException":
      return new HttpError(404, "Cognito user not found", "USER_NOT_FOUND");
    case "LimitExceededException":
    case "TooManyRequestsException":
      return new HttpError(429, "Too many OTP requests. Try again later.", "RATE_LIMITED");
    case "InvalidParameterException":
      if (/USER_PASSWORD_AUTH flow not enabled for this client/i.test(message)) {
        return new HttpError(
          503,
          "Cognito app client auth flow is misconfigured. Enable ALLOW_USER_PASSWORD_AUTH on the app client Authentication flows.",
          "COGNITO_AUTH_FLOW_NOT_ENABLED"
        );
      }

      if (/PrivateLink access is disabled/i.test(message)) {
        return new HttpError(
          503,
          "Cognito PrivateLink is disabled for this user pool while Managed Login is enabled. Enable PrivateLink for the user pool or route Lambda to the public cognito-idp endpoint through NAT.",
          "COGNITO_PRIVATELINK_DISABLED"
        );
      }

      return new HttpError(
        400,
        error?.message ?? "Invalid Cognito signup parameters",
        "INVALID_COGNITO_PARAMETERS"
      );
    case "NotAuthorizedException":
      if (/not authorized to perform|access denied/i.test(message)) {
        return new HttpError(
          503,
          "Lambda role lacks Cognito permissions for profile sync. Grant cognito-idp:AdminUpdateUserAttributes.",
          "COGNITO_PERMISSION_MISSING"
        );
      }

      if (/secret hash/i.test(message)) {
        return new HttpError(
          500,
          "Cognito app client secret mismatch. Set COGNITO_USER_POOL_CLIENT_SECRET or use a client without secret.",
          "COGNITO_SECRET_HASH_MISMATCH"
        );
      }

      return new HttpError(
        401,
        message || "Cognito authorization failed",
        "COGNITO_NOT_AUTHORIZED"
      );
    case "ResourceNotFoundException":
      return new HttpError(
        500,
        "Cognito user pool client is invalid or not found in configured region",
        "COGNITO_CONFIG_MISSING"
      );
    default:
      return new HttpError(502, "Cognito operation failed", "COGNITO_ERROR");
  }
};

export const isCognitoOtpEnabled = () => otpToggle;

export const registerCognitoOtp = async ({
  email,
  password,
  name,
  nickname,
  birthDate,
  gender
}) => {
  try {
    const client = getClient();
    const secretHash = buildSecretHash(email);

    const result = await client.send(
      new SignUpCommand({
        ClientId: cognitoClientId,
        Username: email,
        Password: password,
        UserAttributes: [
          {
            Name: "email",
            Value: email
          },
          {
            Name: "name",
            Value: name
          },
          {
            Name: "nickname",
            Value: nickname
          },
          {
            Name: "birthdate",
            Value: birthDate
          },
          {
            Name: "gender",
            Value: gender
          }
        ],
        ...(secretHash ? { SecretHash: secretHash } : {})
      })
    );

    return {
      cognitoSub: result.UserSub ?? null,
      delivery: mapDelivery(result.CodeDeliveryDetails)
    };
  } catch (error) {
    logError("Cognito signup failed", error, {
      file: "backend/tab1-social/src/lib/cognitoOtp.js",
      location: "registerCognitoOtp",
      action: "invoke Cognito SignUp",
      email
    });

    throw translateCognitoError(error);
  }
};

export const confirmCognitoOtp = async ({ email, code }) => {
  try {
    const client = getClient();
    const secretHash = buildSecretHash(email);

    await client.send(
      new ConfirmSignUpCommand({
        ClientId: cognitoClientId,
        Username: email,
        ConfirmationCode: code,
        ...(secretHash ? { SecretHash: secretHash } : {})
      })
    );

    return {
      verified: true
    };
  } catch (error) {
    if (error?.name === "NotAuthorizedException") {
      logWarn(
        "Cognito confirm signup returned NotAuthorized (likely already verified)",
        {
          file: "backend/tab1-social/src/lib/cognitoOtp.js",
          location: "confirmCognitoOtp",
          action: "invoke Cognito ConfirmSignUp",
          email
        },
        error
      );

      // Cognito returns NotAuthorizedException when user is already confirmed.
      return {
        verified: true
      };
    }

    logError("Cognito confirm signup failed", error, {
      file: "backend/tab1-social/src/lib/cognitoOtp.js",
      location: "confirmCognitoOtp",
      action: "invoke Cognito ConfirmSignUp",
      email
    });

    throw translateCognitoError(error);
  }
};

export const resendCognitoOtp = async ({ email }) => {
  try {
    const client = getClient();
    const secretHash = buildSecretHash(email);

    const result = await client.send(
      new ResendConfirmationCodeCommand({
        ClientId: cognitoClientId,
        Username: email,
        ...(secretHash ? { SecretHash: secretHash } : {})
      })
    );

    return {
      sent: true,
      delivery: mapDelivery(result.CodeDeliveryDetails)
    };
  } catch (error) {
    logError("Cognito resend OTP failed", error, {
      file: "backend/tab1-social/src/lib/cognitoOtp.js",
      location: "resendCognitoOtp",
      action: "invoke Cognito ResendConfirmationCode",
      email
    });

    throw translateCognitoError(error);
  }
};

export const updateCognitoProfile = async ({ email, name, nickname, username }) => {
  if (!cognitoUserPoolId) {
    logWarn({
      message: "COGNITO_USER_POOL_ID not configured. Skipping Cognito profile sync.",
      email
    });
    return { synced: false };
  }

  ensureUserPoolConfig();

  try {
    const client = getClient();

    await client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: cognitoUserPoolId,
        Username: username || email,
        UserAttributes: [
          {
            Name: "name",
            Value: name
          },
          {
            Name: "nickname",
            Value: nickname
          }
        ]
      })
    );

    return { synced: true };
  } catch (error) {
    logError("Cognito profile sync failed", error, {
      file: "backend/tab1-social/src/lib/cognitoOtp.js",
      location: "updateCognitoProfile",
      action: "invoke Cognito AdminUpdateUserAttributes",
      email
    });

    throw translateCognitoError(error);
  }
};

export const checkCognitoLogin = async ({ email, password }) => {
  try {
    const client = getClient();
    const secretHash = buildSecretHash(email);

    await client.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: cognitoClientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          ...(secretHash ? { SECRET_HASH: secretHash } : {})
        }
      })
    );

    return { success: true };
  } catch (error) {
    logError("Cognito login check failed", error, {
      file: "backend/tab1-social/src/lib/cognitoOtp.js",
      location: "checkCognitoLogin",
      action: "invoke Cognito InitiateAuth",
      email
    });

    if (error?.name === "NotAuthorizedException") {
      if (error?.message?.toLowerCase().includes("disabled")) {
        throw new HttpError(403, "Your account is pending admin approval.", "ACCOUNT_DISABLED");
      }
      throw new HttpError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (error?.name === "UserNotFoundException") {
      throw new HttpError(404, "Account does not exist", "USER_NOT_FOUND");
    }

    if (error?.name === "UserNotConfirmedException") {
      throw new HttpError(403, "OTP verification required before login", "OTP_VERIFICATION_REQUIRED");
    }

    throw translateCognitoError(error);
  }
};

