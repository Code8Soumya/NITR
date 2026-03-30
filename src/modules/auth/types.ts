export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AuthGender = "male" | "female" | "other";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  nickname: string;
  branch: string;
  birthDate: string;
  gender: AuthGender;
  bio: string | null;
  interests: string[];
  emailVerified: boolean;
  otpVerifiedAt: string | null;
  approvalStatus: ApprovalStatus;
  isAdmin: boolean;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSession = {
  user: AuthUser;
  tokens: AuthTokens;
};

export type OtpDeliveryDetails = {
  destination: string | null;
  medium: string | null;
  attributeName: string | null;
};

export type AuthRegisterInput = {
  email: string;
  password: string;
  name: string;
  nickname: string;
  birthDate: string;
  gender: AuthGender;
  branch: string;
  bio?: string | null;
  interests?: string[];
};

export type AuthProfileUpdateInput = {
  bio?: string | null;
  interests?: string[];
};

export type OtpRegisterChallenge = {
  otpRequired: true;
  email: string;
  delivery: OtpDeliveryDetails | null;
  message: string;
};

export type AuthRegisterResponse = AuthSession | OtpRegisterChallenge;
