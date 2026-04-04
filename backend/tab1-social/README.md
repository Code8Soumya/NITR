# Tab-1 Social Backend (Hype Feed)

Production backend for NITR HUB Tab-1 using AWS Lambda + API Gateway + Aurora PostgreSQL + S3 pre-signed uploads.

## What This Backend Implements

- Feed listing with cursor pagination and optional hashtag filter
- Post creation with hashtag extraction and media attachment metadata
- Hype toggle (like/unlike)
- Comment creation with one-comment-per-user-per-post upsert behavior
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
|  '- 005_comments_one_per_user.sql # Deduplicate and enforce one comment per user per post
|- scripts/
|  '- runMigration.js            # Migration runner
'- docs/
   '- aws-console-setup.md       # End-to-end AWS setup steps
```

## API Routes

Base path: `/api/v1/social`

1. `GET /health`
2. `GET /posts?limit=20&cursor=...&hashtag=#fest`
3. `GET /users/{userId}/posts?limit=20&cursor=...`
4. `GET /posts/{postId}`
5. `DELETE /posts/{postId}`
6. `POST /posts`
7. `POST /posts/{postId}/hypes`
8. `POST /posts/{postId}/comments`
9. `GET /hashtags/trending?limit=10`
10. `POST /media/upload-url`

Compatibility fallback for delete (if API Gateway route for DELETE is not yet wired):

- `POST /posts` with payload `{ "action": "delete", "postId": "<uuid>" }`

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
- `PG_CONNECT_TIMEOUT_MS`: pg connection timeout in milliseconds (default `5000`; keep lower than Lambda timeout)
- `AWS_REGION`: e.g. `ap-south-1`
- `SOCIAL_MEDIA_BUCKET`: S3 bucket name for tab-1 media
- `SOCIAL_MEDIA_PUBLIC_BASE_URL`: CloudFront URL (recommended)
- `SOCIAL_MEDIA_READ_URL_EXPIRES_IN`: signed media-read URL TTL in seconds (default `3600`, max `86400`)
- `CORS_ALLOW_ORIGIN`: allowed app origin (`*` for development)
- `EXPOSE_INTERNAL_ERRORS`: `true` only for temporary debugging (returns raw unexpected error messages)
- `DEFAULT_FEED_LIMIT`: default pagination size
- `MAX_FEED_LIMIT`: hard page-size cap
- `ENABLE_DEV_HEADERS`: `true` only while auth is not yet wired in app
- `ACCESS_TOKEN_SECRET`: HMAC secret for access token signing
- `REFRESH_TOKEN_SECRET`: HMAC secret for refresh token signing
- `ACCESS_TOKEN_TTL`: access token lifetime (e.g. `15m`)
- `REFRESH_TOKEN_TTL`: refresh token lifetime (e.g. `30d`)
- `BCRYPT_ROUNDS`: password hashing cost factor (default `12`)
- `COGNITO_OTP_ENABLED`: `true` to enforce Cognito OTP verification at registration
- `COGNITO_REGION`: region for Cognito user pool
- `COGNITO_MAX_ATTEMPTS`: Cognito SDK retry attempts (default `2`; lower this if Lambda timeout is tight)
- `COGNITO_USER_POOL_ID`: required for syncing profile updates (`name`, `nickname`) to Cognito
- `COGNITO_USER_POOL_CLIENT_ID`: Cognito app client id
- `COGNITO_USER_POOL_CLIENT_SECRET`: optional app client secret (required only if client is secret-enabled)

When Lambda runs in private subnets and `COGNITO_OTP_ENABLED=true`, ensure outbound HTTPS access to Cognito (`cognito-idp`) via NAT or a VPC interface endpoint.

If register returns `COGNITO_PRIVATELINK_DISABLED` (or Cognito message `PrivateLink access is disabled for the user pool that has ManagedLogin configured`), either enable PrivateLink access for that user pool or route Lambda to public Cognito endpoints via NAT.

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
- Only `122me0914@nitrkl.ac.in` bypasses admin approval and is auto-marked as admin.
- Registration now requires `name`, `nickname`, `birthDate`, and `gender`.
- `nickname` is used as the in-app username.
- When `COGNITO_OTP_ENABLED=true`, registration returns an OTP challenge and user must confirm OTP before login.
- When `COGNITO_OTP_ENABLED=true`, login first attempts Cognito password auth for account-state checks; if the app client does not enable `ALLOW_USER_PASSWORD_AUTH`, backend falls back to local bcrypt verification and logs a warning (`COGNITO_AUTH_FLOW_NOT_ENABLED`).
- `PUT /api/v1/auth/profile` allows updates to `name`, `nickname`, `branch`, `bio`, and `interests`.
- `email`, `birthDate`, and `gender` are immutable after registration.
- When Cognito OTP is enabled, profile updates also sync `name` and `nickname` into Cognito.
- Social endpoints require either admin role or `approved` status.
- Rejected users cannot login.
