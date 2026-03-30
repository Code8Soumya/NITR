# Active Context

**Last Updated**: 2026-03-30

This document tracks the current task, recent changes, known bugs, and next steps. Update this file whenever you complete a feature, pivot tasks, or discover persistent issues.

## Current Task

**Status**: [DONE] Tab-1 full backend implementation (code + frontend wiring + AWS setup docs)

**Objective**: Implement complete backend for Tab-1 (Hype Feed) and connect frontend data layer to production endpoints.

**Progress**:

- [x] Created backend package `backend/tab1-social/` with Node 20 Lambda entrypoint
- [x] Implemented REST routes for feed/posts/hypes/comments/trending hashtags/media upload-url
- [x] Added PostgreSQL repository layer with transaction wrappers and server-side validation
- [x] Added SQL migration (`sql/001_tab1_social.sql`) for social tables, indexes, and update triggers
- [x] Added S3 pre-signed upload URL generation with CloudFront-ready public URL output
- [x] Added auth user extraction from Cognito claims with temporary dev header fallback
- [x] Replaced Tab-1 frontend `hypeApi.ts` with HTTP client for `/api/v1/social/*`
- [x] Updated store mutation handling for backend mutation responses (`toggleHype`, `addComment`)
- [x] Added deployment/setup docs for AWS Console and endpoint contracts

## Recent Changes

### 2026-03-30

- **Identified live register failure root cause from CloudWatch (Lambda -> Aurora timeout)**
  - Observed runtime stack: `pg-pool` connection timeout during `registerUser` transaction, surfaced as unhandled 500.
  - This indicates infrastructure connectivity failure (Lambda VPC/subnet/SG path to Aurora) rather than request payload validation.
  - Added backend fallback mapping for timeout-message-only DB errors (no SQLSTATE code) to return:
    - `DB_UNAVAILABLE` with a targeted message for VPC/SG troubleshooting.
  - Updated DB pool connect timeout to be env-configurable via `PG_CONNECT_TIMEOUT_MS` (default now `15000`) to avoid premature 5s connection cutoff during slow Aurora wake/connect phases.
  - Validation:
    - Backend `npm run check` passes.
  - Status: [DONE]

- **Improved auth failure traceability for API 500 debugging**
  - Backend `errorResponse` now includes `requestId` in both `HttpError` and unknown 500 payloads when available.
  - Backend supports optional `EXPOSE_INTERNAL_ERRORS=true` for temporary non-production debugging of unknown 500 messages.
  - Frontend auth API adapter now logs and surfaces backend `error.code` + `requestId` when present.
  - Expanded DB error translation in auth repository for additional PostgreSQL failure classes:
    - `3D000` (database missing)
    - `28P01` (credential auth failure)
    - `42501` (permission denied)
    - `53300` (connection limit reached)
  - Validation:
    - Backend `npm run check` passes.
    - Frontend `npm run typecheck` passes.
  - Status: [DONE]

- **Hardened auth error diagnostics for register/login 500 troubleshooting**
  - Backend auth repository (`backend/tab1-social/src/lib/authRepository.js`) now maps common PostgreSQL infra/schema failures to explicit API errors instead of opaque 500s:
    - `AUTH_SCHEMA_OUTDATED` (missing/incomplete auth migrations)
    - `DB_UNAVAILABLE` (connection/routing/security-group level DB failures)
  - Cognito OTP helper (`backend/tab1-social/src/lib/cognitoOtp.js`) now translates additional AWS errors with actionable messages:
    - `COGNITO_SECRET_HASH_MISMATCH` when app client secret/hash config is wrong
    - `COGNITO_CONFIG_MISSING` when client/pool lookup fails in configured region
    - `COGNITO_NOT_AUTHORIZED` for non-secret-hash authorization failures
  - Frontend auth API adapter (`src/modules/auth/api/authApi.ts`) now safely handles non-JSON API Gateway/Lambda bodies and includes response status/body preview in logs for faster root-cause detection.
  - Validation:
    - Backend `npm run check` passes.
    - Frontend `npm run typecheck` passes.
  - Status: [DONE]

- **Implemented structured frontend + backend error logging for faster debugging**
  - Added frontend logger utility: `src/shared/utils/logger.ts`
    - Standardized log envelope: timestamp, level, file, location, action, details, serialized error.
  - Added backend logger utility: `backend/tab1-social/src/lib/logger.js`
    - Standardized JSON logs for Lambda/CloudWatch with service name, request context, and error stack metadata.
  - Frontend logging instrumentation:
    - Root-level global JS crash capture in `app/_layout.tsx` via React Native `ErrorUtils` handler.
    - Module render crash logging in `src/shared/components/ModuleErrorBoundary.tsx`.
    - Added catch-path logging to auth/hype stores, API adapters, and auth/hype screens.
  - Backend logging instrumentation:
    - Request-context logs in `backend/tab1-social/src/handler.js` (method/path/requestId/sourceIp).
    - Replaced ad-hoc backend `console.error` with structured logging in `src/lib/http.js`.
    - Added transaction/rollback failure logging in `src/lib/db.js`.
    - Added targeted catch logging in `src/lib/auth.js`, `src/lib/tokenService.js`, `src/lib/cognitoOtp.js`, `src/lib/socialRepository.js`, `src/lib/authRepository.js`.
  - Validation:
    - Frontend `npm run typecheck` passes.
    - Backend syntax check passes for all files in `backend/tab1-social/src`.
  - Status: [DONE]

- **Resolved false SQL errors for PostgreSQL migration files in VS Code**
  - Symptom: `backend/tab1-social/sql/003_auth_cognito_otp.sql` showed T-SQL parser errors (`Incorrect syntax near COLUMN/IF`) despite valid PostgreSQL syntax.
  - Fix: updated workspace settings in `.vscode/settings.json`:
    - `mssql.intelliSense.enableErrorChecking=false`
    - `files.associations` for `**/backend/tab1-social/sql/*.sql` to `plaintext`
  - Result: no editor diagnostics on Postgres migration scripts in this workspace.
  - Status: [DONE]

- **Aligned signup with Cognito required attributes + added profile editor flow**
  - Updated registration contract to require:
    - `name`
    - `nickname` (app username)
    - `birthDate` (`YYYY-MM-DD`)
    - `gender` (`male|female|other`)
  - Added optional profile fields at signup:
    - `bio`
    - `interests[]`
  - Added backend route:
    - `PUT /api/v1/auth/profile` for authenticated bio/interests updates.
  - Added new SQL migration `004_auth_profile_fields.sql` to extend `auth.users` with:
    - `full_name`, `nickname`, `birth_date`, `gender`, `bio`, `interests`
  - Updated Cognito signup attribute payload in backend helper (`email`, `name`, `nickname`, `birthdate`, `gender`).
  - Added frontend profile page:
    - `src/modules/auth/screens/ProfileScreen.tsx`
    - route `app/(tabs)/hype/profile.tsx`
    - entry point from Hype feed header.
  - Validation:
    - Backend `npm run check` passes
    - Frontend `npm run typecheck` passes
  - Status: [DONE]

- **Fixed `002_auth_and_admin.sql` email regex portability**
  - Root cause: prior regex variant used `\s`-style matching that can be misread across SQL tooling contexts.
  - Fix: changed domain/email check to PostgreSQL-safe character class (`[^@[:space:]]+`) while preserving `@nitrkl.ac.in` enforcement.
  - Result: migration is clearer and avoids regex ambiguity during validation.
  - Status: [DONE]

- **Fixed `003_auth_cognito_otp.sql` auto-migration backfill behavior**
  - Root cause: migration runner executes all SQL files on each run, so a plain `UPDATE auth.users SET email_verified=true WHERE email_verified=false` would incorrectly verify newly created users on later runs.
  - Fix: added `auth.migration_markers` + one-time guarded backfill (`003_auth_cognito_otp_backfill`) so legacy-user backfill runs only once.
  - Result: migration remains idempotent while preserving OTP enforcement for new users.
  - Status: [DONE]

- **Enhanced Hype Post Creation to Enforce Mandatory Media**
  - Updated frontend `CreatePostScreen` to make `mediaUri` mandatory and removed the explicit `mediaType` selector UI.
  - Media type (`image` vs `video`) is now automatically inferred based on the extension (e.g. `.mp4`, `.mov`, etc. evaluate to video).
  - Updated frontend payload type in `types.ts` to require `media`.
  - Added backend validation in `handler.js` and `socialRepository.js` for `POST /api/v1/social/posts` to strictly require at least one media item.
  - Documented the mandatory media rule in `api-contract.md`.
  - Status: [DONE]

- **Implemented Cognito OTP verification flow (frontend + backend)**
  - Added backend Cognito helper `backend/tab1-social/src/lib/cognitoOtp.js` using:
    - `SignUp`
    - `ConfirmSignUp`
    - `ResendConfirmationCode`
  - Added OTP auth routes:
    - `POST /api/v1/auth/verify-otp`
    - `POST /api/v1/auth/resend-otp`
  - Updated register/login rules in `authRepository.js`:
    - Register returns OTP challenge when `COGNITO_OTP_ENABLED=true`
    - Login blocked with `OTP_VERIFICATION_REQUIRED` until email is verified
  - Added SQL migration `003_auth_cognito_otp.sql`:
    - `auth.users.cognito_sub`
    - `auth.users.email_verified`
    - `auth.users.otp_verified_at`
  - Added frontend OTP screen + route:
    - `src/modules/auth/screens/VerifyOtpScreen.tsx`
    - `app/(auth)/verify-otp.tsx`
  - Updated register flow to navigate to OTP verification when challenge is returned.
  - Added backend env vars for Cognito OTP (`COGNITO_OTP_ENABLED`, `COGNITO_REGION`, `COGNITO_USER_POOL_CLIENT_ID`, `COGNITO_USER_POOL_CLIENT_SECRET`).
  - Validation:
    - Backend `npm run check` passes
    - Frontend `npm run typecheck` passes
  - Status: [DONE]

- **Implemented production auth + admin approval (frontend + backend)**
  - Added backend auth routes in `backend/tab1-social/src/handler.js`:
    - `POST /api/v1/auth/register`
    - `POST /api/v1/auth/login`
    - `POST /api/v1/auth/refresh`
    - `POST /api/v1/auth/logout`
    - `GET /api/v1/auth/me`
  - Added backend admin approval routes:
    - `GET /api/v1/admin/approvals/pending`
    - `POST /api/v1/admin/approvals/{userId}/approve`
    - `POST /api/v1/admin/approvals/{userId}/reject`
  - Added secure auth data layer with JWT + bcrypt:
    - `src/lib/authRepository.js`
    - `src/lib/tokenService.js`
  - Updated auth guard logic in `src/lib/auth.js` to support:
    - Internal bearer tokens
    - approved-user gate for social endpoints
    - admin-only authorization
  - Added migration `sql/002_auth_and_admin.sql` for:
    - `auth.users`
    - `auth.refresh_sessions`
    - approval/audit columns and indexes
  - Updated migration runner to execute all SQL files in order.
  - Frontend auth module added under `src/modules/auth/` with:
    - SecureStore token persistence
    - Zustand auth store and selectors
    - Login/Register/Pending/Admin screens
    - Auth/admin route groups in `app/(auth)` and `app/(admin)`
    - Root and tab route guards
  - `hypeApi.ts` now automatically sends bearer access token when present.
  - Admin bootstrap configured via env `ADMIN_EMAIL` defaulting to `122ME0914@nitrkl.ac.in`.
  - Validation:
    - Frontend `npm run typecheck` passes after route-type fixes.
    - Backend `npm run check` passes.
  - Status: [DONE]

- **Deployed Tab-1 Backend and Executed DB Migrations**
  - Packaged Lambda code using PowerShell (`Compress-Archive`) and deployed via AWS CLI.
  - Configured API Gateway HTTP API and linked it to the Node.js 20.x Lambda (fixed handler mapping to `src/handler.handler`).
  - Added frontend Dev Headers (`EXPO_PUBLIC_DEV_USER_ID`, etc.) to `.env` to bypass Cognito for initial local testing.
  - Deployed AWS Cloud9 in a public subnet to act as a bastion host for the private Aurora PostgreSQL database.
  - Fixed VPC Security Groups (Added Cloud9 SG to RDS Inbound rules on port 5432) to resolve connection timeouts.
  - Successfully ran `001_tab1_social.sql` migration via `psql` directly on the RDS cluster. Verified schema, tables, and triggers are live.
  - Status: [DONE]

### 2026-03-29

- **Expanded AWS Console deployment guide with security baseline**
  - Updated `backend/tab1-social/docs/aws-console-setup.md` to include:
    - Root-account safety checklist (MFA + no daily root usage)
    - Multi-subnet VPC design (public, private app, private DB)
    - Security group model (Lambda SG -> Aurora SG on 5432 only)
    - Least-privilege IAM role guidance for Lambda
    - Secrets Manager-first credential handling guidance
    - NAT-free deployment profile and endpoint-on-demand strategy
  - Updated `.github/instructions/social-backend.instructions.md` with AWS setup and permissions rules
  - Status: [DONE]

- **Standardized env file placement for Tab-1 setup**
  - Added root `.env` for Expo frontend variables:
    - `EXPO_PUBLIC_SOCIAL_API_BASE_URL`
    - `EXPO_PUBLIC_DEV_USER_ID`
    - `EXPO_PUBLIC_DEV_USER_NAME`
    - `EXPO_PUBLIC_DEV_USER_BRANCH`
  - Added `backend/tab1-social/.env` for backend local values used by migration/testing
  - Updated backend migrate script to load `backend/tab1-social/.env` via Node `--env-file`
  - Updated `social-backend.instructions.md` with explicit env management rules
  - Added `tab1-env.instructions.md` for auto-selected `.env` / `.env.example` guidance
  - Status: [DONE]

- **Implemented Tab-1 backend package (Lambda + Aurora + S3)**
  - Added backend code under `backend/tab1-social/src/`:
    - `handler.js` route dispatcher
    - `lib/socialRepository.js` SQL query layer
    - `lib/media.js` pre-signed URL generator
    - `lib/auth.js`, `lib/http.js`, `lib/db.js`, `lib/errors.js`, `lib/hashtags.js`
  - Added migration `backend/tab1-social/sql/001_tab1_social.sql`:
    - `social.posts`, `social.post_media`, `social.post_hypes`, `social.comments`, `social.hashtags`, `social.post_hashtags`
    - indexes for feed queries and hashtag trend lookups
    - `updated_at` triggers for mutable tables
  - Added backend docs:
    - `backend/tab1-social/README.md`
    - `backend/tab1-social/docs/aws-console-setup.md`
    - `backend/tab1-social/docs/api-contract.md`
  - Added migration runner script `backend/tab1-social/scripts/runMigration.js`
  - Status: [DONE]

- **Rewired Tab-1 frontend to backend endpoints**
  - Updated `src/modules/hype/api/hypeApi.ts`:
    - Uses `EXPO_PUBLIC_SOCIAL_API_BASE_URL`
    - Sends optional dev headers (`EXPO_PUBLIC_DEV_USER_*`)
    - Supports graceful mock fallback when base URL is missing
  - Updated `src/modules/hype/store/hypeStore.ts`:
    - Applies toggle-hype mutation payload `{postId,hypeCount,isHypedByMe}`
    - Appends created comment payload directly to target post
  - Status: [DONE]

- **Resolved npm ERESOLVE during SDK 54 install**
  - Root cause: npm auto-resolved optional `react-dom` peer to `19.2.4`, conflicting with `react@19.1.0`
  - Fix: pinned `react-dom` to `19.1.0` in `package.json`
  - Also pinned `babel-preset-expo` to `~54.0.10` to match Expo SDK 54
  - Validation: `npm install` succeeds and `expo-doctor` reports 17/17 checks passed
  - Status: [DONE]

- **Upgraded Expo SDK from 53 to 54**
  - Migrated dependency set to SDK 54-compatible versions
  - Added missing peer dependencies required by Expo Router/Reanimated
  - Fixed `react-native-worklets` version mismatch (`0.8.1` -> `0.5.1`)
  - Added missing `babel-preset-expo` dev dependency to fix Metro startup
  - Verified full compatibility with Expo Doctor (17/17 checks passed)
  - Status: [DONE]

- **Implemented Tab-1 (Hype Feed) MVP**
  - Added feed UI with trending hashtag filters
  - Added post creation flow (caption + optional media URL + media type)
  - Added post detail with comments and comment composer
  - Added hype toggle with optimistic updates
  - Added mock API adapter for feed/create/hype/comment endpoints
  - Added Zustand isolated state management for Hype module
  - Added module-level error boundary wrapping Tab-1 routes
  - Status: [DONE]

- **Bootstrapped frontend runtime**
  - Added Expo/React Native/Expo Router/NativeWind/Zustand configs
  - Added `@/` alias via `babel-plugin-module-resolver`
  - Fixed lint compatibility by pinning ESLint v8 for legacy Expo config
  - Status: [DONE]

## Known Bugs

- Create-post screen still accepts manual media URLs; upload picker + upload-url flow is not yet wired in UI.
- Workspace reports TypeScript 6 warning in `tsconfig.json` about `baseUrl` deprecation (non-blocking existing warning).

## Next Steps

1. Deploy updated Lambda and map new `PUT /api/v1/auth/profile` route in API Gateway.
2. Apply auth migrations through `004_auth_profile_fields.sql` in Aurora (or run `npm run migrate`).
3. In Cognito user pool, require signup attributes `email`, `name`, `nickname`, `birthdate`, and `gender`.
4. Set production auth env vars (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ADMIN_EMAIL`, token TTLs).
5. Configure Cognito OTP vars (`COGNITO_OTP_ENABLED`, `COGNITO_REGION`, `COGNITO_USER_POOL_CLIENT_ID`, optional client secret).
6. Disable `ENABLE_DEV_HEADERS` in production and use bearer tokens in all app requests.

## Blockers & Decisions Needed

- AWS account setup is required: Aurora connectivity, Lambda deployment, API Gateway routes, and Cognito user-pool/app-client configuration for OTP.

## Technical Debt

- `src/modules/hype/api/hypeApi.ts` still includes mock fallback path for local development.
- Feed UI currently loads a single page and does not consume backend cursor pagination.

## Performance Notes

- Backend feed query uses indexed `(created_at, id)` cursor pagination and hashtag joins; frontend pagination adoption is pending.

## Security Considerations

- Disable `ENABLE_DEV_HEADERS` in production once app JWT auth + Cognito OTP flow is live.
- Move `DATABASE_URL` out of plaintext Lambda env and into Secrets Manager/Parameter Store.
