# AWS Console Setup (Tab-1 Social Backend)

This guide assumes region `ap-south-1` and a deployed React Native app calling API Gateway.

## 0. Root Account Safety First (Required)

If you are currently using the AWS root user, do this before any infrastructure setup:

1. Enable MFA on the root account.
2. Remove root access keys (if any exist).
3. Enable billing alerts and security notifications.
4. Create an IAM admin user/role with MFA and use that for daily work.
5. Do not use root for application deployment or Lambda/API/RDS operations.

## 1. Create a Proper VPC Layout

Use a dedicated VPC for this app (example name: `nitr-social-prod-vpc`).

Suggested network plan:

- VPC CIDR: `10.20.0.0/16`
- 2 Availability Zones
- Public subnets (optional, only if you want NAT):
  - `10.20.0.0/24` (AZ-1)
  - `10.20.1.0/24` (AZ-2)
- Private app subnets (Lambda):
  - `10.20.10.0/24` (AZ-1)
  - `10.20.11.0/24` (AZ-2)
- Private DB subnets (Aurora):
  - `10.20.20.0/24` (AZ-1)
  - `10.20.21.0/24` (AZ-2)

Routing best practice:

- NAT-free profile (recommended for current Tab-1 backend): app private route table has no default internet route and DB private route table has no default internet route.
- NAT profile (only when your Lambda must call public internet): public route table uses `0.0.0.0/0 -> Internet Gateway`, app private route table uses `0.0.0.0/0 -> NAT Gateway`, and DB private route table has no direct internet route.

For the current codebase, NAT-free works because Lambda only needs private TCP access to Aurora and local signing for S3 pre-signed URLs.

Recommended VPC endpoints:

- If no NAT, add only the endpoints you actually need.
- S3 Gateway endpoint: use if Lambda performs direct S3 API calls from VPC.
- Secrets Manager Interface endpoint: use if Lambda fetches DB secret at runtime.
- KMS Interface endpoint: use if Lambda calls KMS APIs directly.
- STS Interface endpoint: use if Lambda calls STS directly.
- For this backend's current default flow, endpoints are optional unless you add runtime AWS API calls.

## 2. Create Security Groups (Least Privilege)

Create these security groups:

- `nitr-social-lambda-sg`: inbound none; outbound TCP 5432 to `nitr-social-aurora-sg`; outbound TCP 443 to endpoint security groups only (if using interface VPC endpoints).
- `nitr-social-aurora-sg`: inbound TCP 5432 from `nitr-social-lambda-sg` only; no inbound from public internet.
- Optional `nitr-admin-access-sg` for bastion or SSM tools if you need manual DB access.

## 3. Aurora PostgreSQL (Private)

1. Create an RDS DB subnet group using the two DB private subnets.
2. Create Aurora PostgreSQL cluster:
   - Public access: disabled
   - Attach security group: `nitr-social-aurora-sg`
3. Create database `nitr` (or your preferred name).
4. Run all migrations in order:
  - `backend/tab1-social/sql/001_tab1_social.sql`
  - `backend/tab1-social/sql/002_auth_and_admin.sql`
  - `backend/tab1-social/sql/003_auth_cognito_otp.sql`
  - `backend/tab1-social/sql/004_auth_profile_fields.sql`

  Use Query Editor v2 or a migration runner that has VPC access.

5. Connection string format:

```text
postgresql://<user>:<password>@<cluster-endpoint>:5432/nitr
```

## 4. Secrets and Environment Strategy

Current backend expects `DATABASE_URL` in Lambda environment.

Good-practice path:

1. Store DB credentials/URL in AWS Secrets Manager.
2. Inject secret value into Lambda environment at deploy time.
3. Never commit real credentials to repo files.

Lambda env keys for this backend:

- `DATABASE_URL`
- `PG_SSL=true`
- `PG_CONNECT_TIMEOUT_MS=15000`
- `AWS_REGION=ap-south-1`
- `SOCIAL_MEDIA_BUCKET=<bucket-name>`
- `SOCIAL_MEDIA_PUBLIC_BASE_URL=<cloudfront-url>`
- `CORS_ALLOW_ORIGIN=<exact-origin-or-list>`
- `EXPOSE_INTERNAL_ERRORS=false` (set `true` only for short debugging windows)
- `DEFAULT_FEED_LIMIT=20`
- `MAX_FEED_LIMIT=50`
- `ENABLE_DEV_HEADERS=false` (production)
- `ADMIN_EMAIL=122ME0914@nitrkl.ac.in`
- `ACCESS_TOKEN_SECRET=<long-random-secret>`
- `REFRESH_TOKEN_SECRET=<long-random-secret>`
- `ACCESS_TOKEN_TTL=15m`
- `REFRESH_TOKEN_TTL=30d`
- `BCRYPT_ROUNDS=12`
- `COGNITO_OTP_ENABLED=true`
- `COGNITO_REGION=ap-south-1`
- `COGNITO_USER_POOL_CLIENT_ID=<cognito-app-client-id>`
- `COGNITO_USER_POOL_CLIENT_SECRET=<optional-if-secret-enabled>`

## 5. S3 + CloudFront for Media

1. Create S3 bucket (example: `nitr-hub-social-media`).
2. Keep bucket private and block all public access.
3. Enable bucket encryption (SSE-S3 or SSE-KMS).
4. Create CloudFront distribution with Origin Access Control (OAC).
5. Use CloudFront domain as `SOCIAL_MEDIA_PUBLIC_BASE_URL`.

## 6. IAM Roles and Permissions (Proper)

Create a dedicated Lambda execution role (example: `nitr-tab1-social-lambda-role`) with:

Managed policies:

1. `AWSLambdaBasicExecutionRole`
2. `AWSLambdaVPCAccessExecutionRole`

Custom inline policy (example baseline):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "WriteSocialMediaObjects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:AbortMultipartUpload"
      ],
      "Resource": "arn:aws:s3:::nitr-hub-social-media/social/*"
    },
    {
      "Sid": "ReadDbSecret",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-south-1:<account-id>:secret:nitr/*"
    },
    {
      "Sid": "CognitoOtpCalls",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:SignUp",
        "cognito-idp:ConfirmSignUp",
        "cognito-idp:ResendConfirmationCode"
      ],
      "Resource": "*"
    }
  ]
}
```

If you are not reading Secrets Manager at runtime yet, remove `ReadDbSecret` for now.

If using KMS CMKs, add `kms:Decrypt` only for required key ARNs.

## 6A. NAT-Free Quick Setup (What to do now)

1. Create VPC with private app and private DB subnets across 2 AZs.
2. Do not create NAT gateway.
3. Keep app/db route tables without `0.0.0.0/0` routes.
4. Put Lambda in private app subnets with `nitr-social-lambda-sg`.
5. Put Aurora in private DB subnets with `nitr-social-aurora-sg`.
6. Allow only SG-to-SG DB access (`5432`).
7. Add VPC endpoints only when a specific runtime call requires one.

## 7. Lambda Function (Inside VPC)

1. Create Lambda:
   - Runtime: Node.js 20.x
   - Handler: `src/handler.handler`
   - Timeout: 15s
   - Memory: 512 MB (start)
2. Upload code from `backend/tab1-social` (include `node_modules`).
3. Configure VPC:
   - Subnets: private app subnets (both AZs)
   - SG: `nitr-social-lambda-sg`
4. Configure log retention and alarms (errors, duration, throttles).

## 8. API Gateway (HTTP API)

Create one HTTP API and integrate all routes to the same Lambda.

Routes:

1. `GET /api/v1/social/health`
2. `GET /api/v1/social/posts`
3. `GET /api/v1/social/posts/{postId}`
4. `POST /api/v1/social/posts`
5. `POST /api/v1/social/posts/{postId}/hypes`
6. `POST /api/v1/social/posts/{postId}/comments`
7. `GET /api/v1/social/hashtags/trending`
8. `POST /api/v1/social/media/upload-url`
9. `POST /api/v1/auth/register`
10. `POST /api/v1/auth/verify-otp`
11. `POST /api/v1/auth/resend-otp`
12. `POST /api/v1/auth/login`
13. `PUT /api/v1/auth/profile`
14. `POST /api/v1/auth/refresh`
15. `POST /api/v1/auth/logout`
16. `GET /api/v1/auth/me`
17. `GET /api/v1/admin/approvals/pending`
18. `POST /api/v1/admin/approvals/{userId}/approve`
19. `POST /api/v1/admin/approvals/{userId}/reject`

CORS:

1. Allow only your known client origins.
2. Allow headers: `Content-Type,Authorization,X-Dev-User-Id,X-Dev-User-Name,X-Dev-User-Branch,X-Dev-User-Email`.
3. Allow methods: `GET,POST,PUT,OPTIONS`.

## 9. Cognito OTP Setup

1. Create a Cognito User Pool.
2. Configure email-based sign-in and email verification.
3. Enable self-registration.
4. Set required signup attributes:
  - `email`
  - `name`
  - `nickname`
  - `birthdate`
  - `gender`
5. Keep sign-in option as Email.
6. Create an App Client for mobile auth flows.
7. Use `ALLOW_USER_PASSWORD_AUTH` in app client auth flows.
8. Set Lambda env vars:
  - `COGNITO_OTP_ENABLED=true`
  - `COGNITO_REGION`
  - `COGNITO_USER_POOL_CLIENT_ID`
  - `COGNITO_USER_POOL_CLIENT_SECRET` (only if the app client uses a secret)
9. Keep `ENABLE_DEV_HEADERS=false` in production.
10. API Gateway Cognito JWT authorizer is optional for this implementation because API auth still relies on app-issued JWT tokens.

## 10. Frontend Env Setup

In root `.env`:

```env
EXPO_PUBLIC_SOCIAL_API_BASE_URL=https://<api-id>.execute-api.<region>.amazonaws.com
EXPO_PUBLIC_DEV_USER_ID=
EXPO_PUBLIC_DEV_USER_NAME=
EXPO_PUBLIC_DEV_USER_BRANCH=
```

For production, stop using dev headers and send Cognito bearer token from auth module.

## 11. Smoke Tests

After deployment:

1. `GET /api/v1/social/health` returns `status: ok`.
2. `POST /api/v1/social/posts` creates a post.
3. `GET /api/v1/social/posts` returns created post.
4. `POST /api/v1/social/posts/{postId}/hypes` toggles hype.
5. `POST /api/v1/social/posts/{postId}/comments` stores comment.
6. `POST /api/v1/social/media/upload-url` returns `uploadUrl`, `publicUrl`, `key`.

## 12. Good-Practice Checklist

1. Root user not used for daily operations.
2. IAM users/roles protected by MFA.
3. Aurora in private subnets, no public inbound.
4. Lambda in private app subnets with least-privilege SG.
5. Secrets in Secrets Manager, not code/repo.
6. CORS restricted, dev headers disabled.
7. CloudWatch alarms + log retention configured.
8. S3 bucket private with CloudFront OAC.
