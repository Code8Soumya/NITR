# Active Context

**Last Updated**: 2026-03-31

This document tracks the current task, recent changes, known bugs, and next steps. Update this file whenever you complete a feature, pivot tasks, or discover persistent issues.

## Current Task

**Status**: [DONE] Tab-1 media-fit + ratio/crop + hashtag-limit hardening

**Objective**: Fix remaining video rendering/control issues in Hype feed, expand supported media ratios, add photo crop-to-ratio flow, remove bottom hashtag text from post cards, and enforce max 5 hashtags per post.

**Progress**:

- [x] Expanded allowed media ratios to include `3:4` and `4:3` in shared ratio utility
- [x] Added photo crop-window ratio selector in `CreatePostScreen` and separated photo/video picker flows
- [x] Updated `PostCard` media rendering to contain-fit visuals, reliable autoplay-muted behavior, and stable pause/mute controls
- [x] Removed post-bottom hashtag text rendering in card UI while keeping caption preview
- [x] Enforced max 5 unique hashtags in frontend create validation and backend `createPost` validation
- [x] Updated API contract and memory-bank docs for new behavior

## Recent Changes

### 2026-03-31

- **Fixed Tab-1 media rendering and input constraints after UX bug report**
  - Requirement covered:
    - videos and photos should render properly and fit screen better
    - add `3:4` and `4:3` support
    - photo-only crop window for selected target ratio
    - fix play/mute button bugs
    - remove bottom red hashtag text from posts
    - enforce max 5 hashtags per post
  - Frontend changes:
    - updated `src/modules/hype/utils/mediaAspectRatio.ts` allowed labels to `9:16`, `16:9`, `3:4`, `4:3`, `1:1`, `4:5` and added crop-dimension helper.
    - refactored `src/modules/hype/screens/CreatePostScreen.tsx` into separate photo/video pickers; photos now open crop UI with selectable allowed ratio.
    - added client-side hashtag cap (`5`) in `CreatePostScreen` and `src/modules/hype/api/hypeApi.ts`.
    - updated `src/modules/hype/components/PostCard.tsx` to contain-fit media, improved autoplay/mute/pause control logic, and removed bottom hashtag text rendering.
    - tuned feed layout/viewability thresholds in `src/modules/hype/screens/HypeFeedScreen.tsx` and aligned detail spacing in `src/modules/hype/screens/PostDetailScreen.tsx`.
    - replaced mock video URI in `src/modules/hype/constants/mockFeed.ts` with a playable sample clip.
  - Backend changes:
    - added hashtag limit validator in `backend/tab1-social/src/lib/hashtags.js` (`MAX_HASHTAGS_PER_POST=5`).
    - enforced hashtag cap in `backend/tab1-social/src/lib/socialRepository.js` during `createPost`.
  - Contract/docs changes:
    - updated `backend/tab1-social/docs/api-contract.md` to document hashtag cap and expanded frontend ratio policy.
    - updated memory-bank docs (`project_docs/architecture.md`, `project_docs/file_index.md`, `project_docs/active_context.md`).
  - Validation:
    - frontend: `npm run typecheck` passes.
    - backend: `cd backend/tab1-social; npm run check` passes.
    - diagnostics: no errors in touched files.
  - Status: [DONE]

- **Enabled real profile bio in Tab-1 feed/post responses**
  - Requirement covered:
    - UI should show real profile bio from backend, not only a frontend fallback.
  - Backend changes:
    - updated `backend/tab1-social/src/lib/socialRepository.js` `listFeed` and `fetchPostById` SQL to `LEFT JOIN auth.users` and hydrate `author_bio` from `auth.users.bio`.
    - updated post mapping to emit `authorBio` when a non-empty profile bio exists.
  - Contract/docs changes:
    - updated `backend/tab1-social/docs/api-contract.md` feed item shape with optional `authorBio`.
    - updated memory-bank docs (`project_docs/architecture.md`, `project_docs/file_index.md`, `project_docs/active_context.md`).
  - Validation:
    - backend: `cd backend/tab1-social; npm run check` passes.
    - frontend: `npm run typecheck` passes.
  - Status: [DONE]

- **Implemented Tab-1 frontend media ratio restrictions + video UX controls**
  - Requirement covered:
    - users can upload only `9:16`, `16:9`, `1:1`, `4:5` photo/video assets from gallery.
    - feed/detail cards now render both image and video media using aspect-ratio-aware containers.
    - videos autoplay muted when post cards enter viewport and include mute/pause controls.
    - card top metadata now includes `authorName`, `authorBranch`, short `authorBio`; caption preview is intentionally truncated.
  - Frontend changes:
    - added `src/modules/hype/utils/mediaAspectRatio.ts` with allowed-ratio matching and normalization helpers.
    - updated `src/modules/hype/screens/CreatePostScreen.tsx` to validate picked media dimensions before submit.
    - updated `src/modules/hype/components/PostCard.tsx` for video playback (`expo-av`), in-view autoplay, and controls.
    - updated `src/modules/hype/screens/HypeFeedScreen.tsx` with `FlatList` viewability tracking to drive autoplay visibility.
    - updated `src/modules/hype/types.ts`, `src/modules/hype/api/hypeApi.ts`, and `src/modules/hype/constants/mockFeed.ts` for optional author bio and ratio metadata.
    - installed `expo-av` in root `package.json`.
  - Validation:
    - frontend: `npm run typecheck` passes.
  - Status: [DONE]

- **Hardened immutable-profile-field enforcement at route boundary**
  - Symptom: `PUT /api/v1/auth/profile` could silently ignore immutable keys (`email`, `gender`, `birthDate`) because handler payload mapping dropped those fields before repository validation.
  - Fix:
    - updated `backend/tab1-social/src/handler.js` to forward immutable keys (`email`, `gender`, `birthDate`, `birthdate`, `birth_date`) into profile-update input.
    - updated `backend/tab1-social/src/lib/authRepository.js` `updateUserProfile` argument forwarding so `validateProfilePatchInput` can explicitly reject immutable-field update attempts with `IMMUTABLE_PROFILE_FIELD`.
  - Validation:
    - backend: `cd backend/tab1-social; npm run check` passes.
    - frontend: `npm run typecheck` passes.
  - Status: [DONE]

- **Implemented approval exception + immutable profile fields + Cognito sync + calendar/animation UX**
  - Requirement covered:
    - admin approval now applies to all users except `122me0914@nitrkl.ac.in`.
    - profile updates now allow `name`, `nickname`, `branch`, `bio`, `interests` for both users and admins.
    - `email`, `birthDate`, and `gender` are blocked from profile edits.
    - registration birthdate selection now uses calendar picker to prevent malformed date text.
    - button press animations and animated update feedback added for improved UX.
  - Backend changes:
    - updated `backend/tab1-social/src/lib/authRepository.js` profile patch validation and update flow.
    - updated `backend/tab1-social/src/lib/cognitoOtp.js` with `updateCognitoProfile` (`AdminUpdateUserAttributes`).
    - updated `backend/tab1-social/src/handler.js` profile route payload mapping.
    - added migration `backend/tab1-social/sql/006_admin_bypass_and_auth_profile_sync.sql`.
    - updated backend docs/env templates for `COGNITO_USER_POOL_ID` and removed `ADMIN_EMAIL` dependency.
  - Frontend changes:
    - installed `@react-native-community/datetimepicker`.
    - updated `RegisterScreen` to calendar-only birthdate input.
    - updated `ProfileScreen` to editable allowed fields + read-only immutable fields + animated update feedback.
    - added reusable `src/shared/components/AnimatedPressable.tsx` and applied it across auth/admin action buttons.
  - Validation:
    - frontend: `npm run typecheck` passes.
    - backend: `cd backend/tab1-social; npm run check` passes.
    - extra syntax checks: `node --check src/lib/authRepository.js` and `node --check src/lib/cognitoOtp.js` pass.
  - Status: [DONE]

- **Fixed Tab-1 photo visibility + one-comment-per-user behavior**
  - Symptoms:
    - Users reported uploaded photos were not visible in feed/detail cards.
    - Users could post multiple comments on the same post instead of editing their prior one.
  - Root causes:
    - media URL handling assumed fully valid public URLs and did not recover when `SOCIAL_MEDIA_PUBLIC_BASE_URL` was misformatted (missing scheme) or when stored URLs required signed S3 read access.
    - comment write path used plain inserts in `social.comments`, allowing duplicate comments per `(post_id, user_id)`.
  - Fix:
    - updated `backend/tab1-social/src/lib/media.js` to normalize public base URL (`https://` fallback) and added read-URL resolver for S3-backed media.
    - updated `backend/tab1-social/src/lib/socialRepository.js` hydration to resolve media URLs per item and updated comments mutation to transaction-safe update-then-insert upsert logic.
    - added migration `backend/tab1-social/sql/005_comments_one_per_user.sql` to deduplicate existing comment rows and enforce unique `(post_id, user_id)`.
    - updated frontend store and detail composer (`src/modules/hype/store/hypeStore.ts`, `src/modules/hype/screens/PostDetailScreen.tsx`) so repeat comment submission replaces current user comment in UI state.
    - hardened card media rendering (`src/modules/hype/components/PostCard.tsx`) with URI normalization and image-load fallback state.
    - aligned mock behavior in `src/modules/hype/api/hypeApi.ts` so local mode also updates existing user comment.
  - Validation:
    - frontend typecheck: `npm run typecheck` passes.
    - backend syntax check: `cd backend/tab1-social; npm run check` passes.
    - VS Code diagnostics: no errors in changed frontend/backend source files.
  - Status: [DONE]

- **Fixed create-post flow to upload local photo/video files instead of manual URLs**
  - Symptom: `CreatePostScreen` required users to paste media URLs, so students could not publish directly from gallery media.
  - Root cause: frontend create-post UI and API payload wiring were still in legacy URL-input mode, despite backend support for `/api/v1/social/media/upload-url`.
  - Fix:
    - updated `src/modules/hype/screens/CreatePostScreen.tsx` to use `expo-image-picker` and let users pick one photo or video.
    - updated `src/modules/hype/types.ts` to allow optional `fileName` and `mimeType` in create-post media payload items.
    - updated `src/modules/hype/api/hypeApi.ts` create-post flow to request pre-signed upload URLs, upload binary media to S3 via `PUT`, then submit post with CDN/public URLs.
    - installed `expo-image-picker` in frontend dependencies.
  - Validation:
    - Frontend typecheck (`npm run typecheck`): passes.
  - Status: [DONE]

- **Handled Cognito login failure: `USER_PASSWORD_AUTH flow not enabled for this client`**
  - Symptom: Login for newly created users failed with backend `INVALID_COGNITO_PARAMETERS` and message `USER_PASSWORD_AUTH flow not enabled for this client` from `checkCognitoLogin`.
  - Root cause: backend login check used Cognito `InitiateAuth` with `USER_PASSWORD_AUTH`, but the Cognito app client authentication-flow config did not include `ALLOW_USER_PASSWORD_AUTH`.
  - Fix:
    - updated `backend/tab1-social/src/lib/cognitoOtp.js` to map this case to explicit `COGNITO_AUTH_FLOW_NOT_ENABLED`.
    - updated `backend/tab1-social/src/lib/authRepository.js` login flow to gracefully fall back to local bcrypt password verification when this specific app-client misconfiguration occurs.
    - updated docs in `backend/tab1-social/README.md` and `backend/tab1-social/docs/aws-console-setup.md` with the exact Cognito app-client setting required.
  - Validation:
    - `npm run check` (backend package) passes.
    - `node --check src/lib/cognitoOtp.js` and `node --check src/lib/authRepository.js` pass.
  - Status: [DONE]

- **Reduced noisy auth ERROR logs and improved runtime log readability**
  - Symptom: Metro console showed repeated `ERROR [NITR-HUB]` call stacks during login failures without readable first-line context.
  - Root cause:
    - logger emitted prefix + object payload, and Metro often surfaced only the first token (`[NITR-HUB]`) in error output.
    - expected auth 4xx failures (for example `USER_NOT_FOUND`, `INVALID_CREDENTIALS`) were logged as `error` in multiple layers.
  - Fix:
    - updated `src/shared/utils/logger.ts` to emit a contextual single-line message first (`level | message | file:location | action | code | error.message`).
    - changed `src/modules/auth/api/authApi.ts` request catch to log 4xx responses as `warn`, keeping `error` for network/5xx failures.
    - changed `src/modules/auth/store/authStore.ts` login catch to log expected auth failures as `warn`.
    - removed duplicate screen-level error logging in `src/modules/auth/screens/LoginScreen.tsx` and preserved OTP redirect detection via `error.code`.
  - Validation:
    - VS Code diagnostics clean for touched files.
    - Frontend typecheck (`npm run typecheck`): passes.
  - Status: [DONE]

- **Fixed Android bundling SyntaxError in LoginScreen JSX**
  - Symptom: Metro/Babel failed with `Adjacent JSX elements must be wrapped in an enclosing tag` in `src/modules/auth/screens/LoginScreen.tsx` near line 63.
  - Root cause: a prior bad edit placed JSX nodes inside `onSubmit` catch block, removing the component `return` boundary and breaking JSX tree parsing.
  - Fix: restored valid `onSubmit` closure and rebuilt the screen `return` with a single `SafeAreaView` root containing header, form card, and register link row.
  - Validation:
    - VS Code diagnostics for `LoginScreen.tsx`: no errors.
    - Full frontend typecheck (`tsc --noEmit`): passes.
  - Status: [DONE]

- **Fixed authApi TypeScript/syntax regressions discovered during login fix validation**
  - Symptom: `npm run typecheck` failed in `src/modules/auth/api/authApi.ts` with parser/type errors.
  - Root cause:
    - missing closing brace in `if (!response.ok)` block of `request<T>` helper.
    - unsafe return of `parsed.data` without null/undefined guard under strict typing.
  - Fix:
    - closed `if (!response.ok)` block before success return.
    - added explicit success-envelope guard: throw if parsed JSON is null or `data` is undefined.
  - Validation:
    - VS Code diagnostics for `authApi.ts`: no errors.
    - Full frontend typecheck (`tsc --noEmit`): passes.
  - Status: [DONE]

- **Fixed Android bundling SyntaxError in PendingApprovalScreen JSX**
  - Symptom: Metro/Babel failed with `Unterminated JSX contents` in `src/modules/auth/screens/PendingApprovalScreen.tsx` near `</SafeAreaView>`.
  - Root cause: missing closing `</Text>` for the approval/rejection message and missing outer card `</View>` caused invalid JSX tree.
  - Fix: added both missing closing tags in `PendingApprovalScreen.tsx`.
  - Validation:
    - VS Code diagnostics for `PendingApprovalScreen.tsx`: no errors.
  - Status: [DONE]

- **Resolved register 400 diagnosis: Cognito PrivateLink disabled for Managed Login pool**
  - CloudWatch now shows `InvalidParameterException`: `PrivateLink access is disabled for the user pool that has ManagedLogin configured` during `SignUp`.
  - Backend now maps this to explicit:
    - `COGNITO_PRIVATELINK_DISABLED`
  - Fixed by completely disabling/removing the "Managed Login" setup (Cognito Domain) in the AWS Console for the User Pool. AWS PrivateLink (VPC Interface Endpoints) does not support User Pools that have Managed Login enabled.
  - Validation:
    - User confirmed the 400 error is resolved after disabling Managed Login.
  - Status: [DONE]

- **Resolved register 502 diagnosis: Cognito network timeout from Lambda private networking**
  - CloudWatch showed `registerCognitoOtp` failing with `TimeoutError` / `ETIMEDOUT` while calling Cognito `SignUp`.
  - Backend now maps Cognito network timeout/connectivity failures to explicit:
    - `COGNITO_NETWORK_UNAVAILABLE`
  - Added Cognito SDK retry tuning via env:
    - `COGNITO_MAX_ATTEMPTS` (default `2`) to avoid long retry chains that can approach Lambda timeout.
  - Updated deployment docs to require outbound Cognito path when OTP is enabled:
    - NAT egress or interface endpoint `com.amazonaws.<region>.cognito-idp` for private-subnet Lambda.
  - Validation:
    - Backend `npm run check` passes.
  - Status: [DONE]

### 2026-03-30

- **Identified live register failure root cause from CloudWatch (Lambda -> Aurora timeout)**
  - Observed runtime stack: `pg-pool` connection timeout during `registerUser` transaction, surfaced as unhandled 500.
  - This indicates infrastructure connectivity failure (Lambda VPC/subnet/SG path to Aurora) rather than request payload validation.
  - Added backend fallback mapping for timeout-message-only DB errors (no SQLSTATE code) to return:
    - `DB_UNAVAILABLE` with a targeted message for VPC/SG troubleshooting.
  - Updated DB pool connect timeout to be env-configurable via `PG_CONNECT_TIMEOUT_MS` with safer default `5000` so failures return before 15s Lambda timeout.
  - Added deployment guidance to keep `PG_CONNECT_TIMEOUT_MS` lower than Lambda timeout; otherwise API Gateway returns generic timeout errors.
  - Frontend auth API errors now add a specific hint when receiving API Gateway generic 500 body (`{"message":"Internal Server Error"}`), indicating likely Lambda timeout/unhandled upstream failure.
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
