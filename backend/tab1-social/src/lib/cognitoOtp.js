import crypto from "node:crypto";

import {
  CognitoIdentityProviderClient,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";

import { HttpError } from "./errors.js";
import { logError, logWarn } from "./logger.js";

const otpToggle = (process.env.COGNITO_OTP_ENABLED ?? "false").toLowerCase() === "true";
const cognitoRegion = process.env.COGNITO_REGION ?? process.env.AWS_REGION;
const cognitoClientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
const cognitoClientSecret = process.env.COGNITO_USER_POOL_CLIENT_SECRET;

let cognitoClient;

const ensureConfig = () => {
  if (!otpToggle) {
    throw new HttpError(400, "Cognito OTP is disabled", "COGNITO_OTP_DISABLED");
  }

  if (!cognitoRegion || !cognitoClientId) {
    throw new HttpError(
      500,
      "COGNITO_REGION and COGNITO_USER_POOL_CLIENT_ID must be configured",
      "COGNITO_CONFIG_MISSING"
    );
  }
};

const getClient = () => {
  ensureConfig();

  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({
      region: cognitoRegion
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

  const message = typeof error?.message === "string" ? error.message : "";

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
      return new HttpError(
        400,
        error?.message ?? "Invalid Cognito signup parameters",
        "INVALID_COGNITO_PARAMETERS"
      );
    case "NotAuthorizedException":
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
