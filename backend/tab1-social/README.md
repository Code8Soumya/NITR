# Tab-1 Social Backend (Hype Feed)

Production backend for NITR HUB Tab-1 using AWS Lambda + API Gateway + Aurora PostgreSQL + S3 pre-signed uploads.

## What This Backend Implements

- Feed listing with cursor pagination and optional hashtag filter
- Post creation with hashtag extraction and media attachment metadata
- Hype toggle (like/unlike)
- Comment creation
- Trending hashtag aggregation
- S3 pre-signed upload URL generation for image/video media
- Auth module with NITR email registration/login, JWT access + refresh sessions
- Cognito OTP verification on registration (email confirmation)
- Admin approval workflow for pending users (admin email controlled by env)
- Cognito-authorizer support (plus optional dev headers fallback)

## Folder Structure

```text
backend/tab1-social/
|- src/
|  |- handler.js                 # Lambda entrypoint and route dispatch
|  '- lib/
|     |- auth.js                 # Cognito claims / dev-header user extraction
|     |- authRepository.js       # Auth + admin approval SQL logic
|     |- cognitoOtp.js           # Cognito SignUp/Confirm/Resend OTP integration
|     |- db.js                   # Postgres pool + transaction helper
|     |- errors.js               # Typed HTTP errors
|     |- hashtags.js             # hashtag parsing and normalization
|     |- http.js                 # API Gateway response helpers
|     |- media.js                # S3 pre-signed URL helper
|     |- tokenService.js         # JWT signing/verification helpers
|     '- socialRepository.js     # SQL queries and domain logic
|- sql/
|  '- 001_tab1_social.sql        # Tab-1 schema migration
|  '- 002_auth_and_admin.sql     # Auth users + refresh sessions + approvals
|  '- 003_auth_cognito_otp.sql   # Cognito OTP fields + email verification columns
|  '- 004_auth_profile_fields.sql # nickname/name/birthdate/gender/bio/interests fields
|- scripts/
|  '- runMigration.js            # Migration runner
'- docs/
   '- aws-console-setup.md       # End-to-end AWS setup steps
```

## API Routes

Base path: `/api/v1/social`

1. `GET /health`
2. `GET /posts?limit=20&cursor=...&hashtag=#fest`
3. `GET /posts/{postId}`
4. `POST /posts`
5. `POST /posts/{postId}/hypes`
6. `POST /posts/{postId}/comments`
7. `GET /hashtags/trending?limit=10`
8. `POST /media/upload-url`

Base path: `/api/v1/auth`

1. `POST /register`
2. `POST /login`
3. `POST /verify-otp`
4. `POST /resend-otp`
5. `PUT /profile`
6. `POST /refresh`
7. `POST /logout`
8. `GET /me`

Base path: `/api/v1/admin`

1. `GET /approvals/pending`
2. `POST /approvals/{userId}/approve`
3. `POST /approvals/{userId}/reject`

Response envelope:

```json
{
  "data": {}
}
```

Error envelope:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable error"
  }
}
```

## Environment Variables

Create Lambda environment variables from `.env.example`:

- `DATABASE_URL`: Aurora PostgreSQL connection string
- `PG_SSL`: `true` for Aurora in VPC
- `PG_CONNECT_TIMEOUT_MS`: pg connection timeout in milliseconds (default `15000`)
- `AWS_REGION`: e.g. `ap-south-1`
- `SOCIAL_MEDIA_BUCKET`: S3 bucket name for tab-1 media
- `SOCIAL_MEDIA_PUBLIC_BASE_URL`: CloudFront URL (recommended)
- `CORS_ALLOW_ORIGIN`: allowed app origin (`*` for development)
- `EXPOSE_INTERNAL_ERRORS`: `true` only for temporary debugging (returns raw unexpected error messages)
- `DEFAULT_FEED_LIMIT`: default pagination size
- `MAX_FEED_LIMIT`: hard page-size cap
- `ENABLE_DEV_HEADERS`: `true` only while auth is not yet wired in app
- `ADMIN_EMAIL`: the only email that receives admin privileges during registration
- `ACCESS_TOKEN_SECRET`: HMAC secret for access token signing
- `REFRESH_TOKEN_SECRET`: HMAC secret for refresh token signing
- `ACCESS_TOKEN_TTL`: access token lifetime (e.g. `15m`)
- `REFRESH_TOKEN_TTL`: refresh token lifetime (e.g. `30d`)
- `BCRYPT_ROUNDS`: password hashing cost factor (default `12`)
- `COGNITO_OTP_ENABLED`: `true` to enforce Cognito OTP verification at registration
- `COGNITO_REGION`: region for Cognito user pool
- `COGNITO_USER_POOL_CLIENT_ID`: Cognito app client id
- `COGNITO_USER_POOL_CLIENT_SECRET`: optional app client secret (required only if client is secret-enabled)

## Local Setup

1. Install dependencies

```bash
cd backend/tab1-social
npm install
```

2. Create local backend env file

```bash
cp .env.example .env
```

Then fill all values in `.env`.

3. Run migration

```bash
npm run migrate
```

4. Deploy Lambda code (zip + upload) and connect to API Gateway routes.

Detailed steps: [docs/aws-console-setup.md](docs/aws-console-setup.md)

## Frontend Wiring

Create root `.env` and set these Expo vars (used in `src/modules/hype/api/hypeApi.ts`):

- `EXPO_PUBLIC_SOCIAL_API_BASE_URL`
- `EXPO_PUBLIC_DEV_USER_ID` (optional dev only)
- `EXPO_PUBLIC_DEV_USER_NAME` (optional dev only)
- `EXPO_PUBLIC_DEV_USER_BRANCH` (optional dev only)

If `EXPO_PUBLIC_SOCIAL_API_BASE_URL` is not set, frontend falls back to the previous in-memory mock adapter for local UI iteration.

## Auth + Approval Behavior

- All non-admin registrations start in `pending` state.
- Registration now requires `name`, `nickname`, `birthDate`, and `gender`.
- `nickname` is used as the in-app username.
- When `COGNITO_OTP_ENABLED=true`, registration returns an OTP challenge and user must confirm OTP before login.
- `bio` and `interests` can be sent during registration and later edited through `PUT /api/v1/auth/profile`.
- Social endpoints require either admin role or `approved` status.
- Rejected users cannot login.
- The admin email defaults to `122ME0914@nitrkl.ac.in` and can be overridden by `ADMIN_EMAIL`.
