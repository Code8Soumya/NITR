# File Index

**Last Updated**: 2026-04-07

This document maps the project directory structure and describes key files. Update this file whenever you create, delete, or significantly modify files.

## Current Project Status

[DONE] Expo project scaffolded, [DONE] Tab-1 frontend implemented, and [DONE] Tab-1 Lambda backend scaffolded with Aurora + S3 integration.

## Directory Structure

```text
NITR/
|- app/
|  |- _layout.tsx                      # Root layout: SafeArea + GestureHandler + stack + global JS error logger install
|  |- index.tsx                        # Auth-aware redirect to login/pending/admin/tabs
|  |- (auth)/
|  |  |- _layout.tsx                   # Auth route-group stack wrapper
|  |  |- login.tsx                     # Login route
|  |  |- register.tsx                  # Registration route
|  |  |- verify-otp.tsx                # OTP verification route
|  |  '- pending.tsx                   # Pending-approval route for non-approved users
|  |- (admin)/
|  |  |- _layout.tsx                   # Admin-only route-group guard
|  |  '- approvals.tsx                 # Admin pending-user approvals route
|  '- (tabs)/
|     |- _layout.tsx                   # 3-tab navigator + hidden route registration for create/post/profile/edit-profile screens
|     |- hype/
|     |  |- index.tsx                  # Tab-1 feed route (with error boundary)
|     |  |- create.tsx                 # Tab-1 create post route
|     |  |- profile.tsx                # Authenticated profile view route (details + posts + edit-profile navigation)
|     |  |- edit-profile.tsx           # Dedicated profile edit route wrapper
|     |  '- [postId].tsx               # Tab-1 post detail route
|     |- campus/
|     |  '- index.tsx                  # Tab-2 placeholder screen
|     '- quest/
|        '- index.tsx                  # Tab-3 placeholder screen|- scripts/
|  |- generate-bridges.js              # Parses routes, API calls, lambdas, and DB repositories to build logic map
|  '- watch-bridges.js                 # Watches code files and dynamically re-runs generate-bridges.js
|- project_docs/
|  |- active_context.md                # Tracks current tasks, bugs, and recent PRs
|  |- architecture.md                  # Core tech stack and isolated module structural overview
|  |- database_design.md               # PostgreSQL schema structure, constraints, and relationships
|  |- file_index.md                    # This file (directory map and file responsibilities)
|  '- logic_bridges.md                 # Auto-generated routing map bridging UI → Zustand → APIs → Lambdas → DB|- src/
|  |- modules/
|  |  '- auth/                         # Auth + admin-approval isolated module
|  |     |- api/
|  |     |  '- authApi.ts              # API adapter for /api/v1/auth and /api/v1/admin endpoints
|  |     |- hooks/
|  |     |  '- useAuth.ts              # Derived auth selectors over Zustand auth store
|  |     |- screens/
|  |     |  |- AdminApprovalsScreen.tsx # Admin approval dashboard UI with animated action buttons
|  |     |  |- LoginScreen.tsx          # Login screen UI with animated submit button
|  |     |  |- PendingApprovalScreen.tsx # Pending-state screen for unapproved users with animated actions
|  |     |  |- ProfileScreen.tsx        # Edit-profile form for name/nickname/branch/bio/interests + locked email/gender/birthDate + animated save feedback
|  |     |  |- ProfileViewScreen.tsx    # Profile view page with details, sign-out/admin actions, posts list, and edit-profile CTA
|  |     |  |- RegisterScreen.tsx       # Registration screen UI with calendar birthdate picker (no free-text date input)
|  |     |  '- VerifyOtpScreen.tsx      # Cognito OTP verification and resend UI with animated buttons
|  |     |- storage/
|  |     |  '- tokenStorage.ts         # SecureStore access/refresh token persistence
|  |     |- store/
|  |     |  '- authStore.ts            # Auth lifecycle/session Zustand store
|  |     '- types.ts                   # Auth domain types
|  |  '- hype/                         # Tab-1 isolated module
|  |     |- api/
|  |     |  '- hypeApi.ts              # HTTP API adapter for /api/v1/social with local mock fallback + pre-signed media upload flow (Android-safe local URI blob fallback) + delete-post compatibility fallback when DELETE route is unavailable
|  |     |- components/
|  |     |  |- CommentBubble.tsx       # Comment row UI
|  |     |  |- HashtagRail.tsx         # Trending hashtag filter UI
|  |     |  '- PostCard.tsx            # Reusable post card UI with contain-fit image/video rendering via `expo-video`, viewport-muted autoplay, top user metadata, and stable mute/pause controls
|  |     |- constants/
|  |     |  '- mockFeed.ts             # Seed feed data
|  |     |- hooks/
|  |     |  |- useHypeActions.ts       # Action hooks over Zustand store
|  |     |  '- useHypeFeed.ts          # Feed selectors/loading logic
|  |     |- screens/
|  |     |  |- CreatePostScreen.tsx    # Create post screen with separate photo/video pickers, photo crop window ratios (9:16/16:9/3:4/4:3/1:1/4:5), strict ratio validation, hashtag-count guardrail, and `expo-video` preview for selected videos
|  |     |  |- HypeFeedScreen.tsx      # Feed list screen with global 3-state video audio mode toggle (red/yellow/green)
|  |     |  '- PostDetailScreen.tsx    # Post + comments screen with edit-aware single-comment composer
|  |     |- store/
|  |     |  '- hypeStore.ts            # Zustand isolated state/actions, including global video audio mode state (`forced-muted` | `start-muted` | `start-unmuted`)
|  |     |- utils/
|  |     |  '- mediaAspectRatio.ts     # Allowed media ratio constants/helpers for validation, display normalization, and crop aspect dimensions
|  |     '- types.ts                   # Tab-1 domain types
|  '- shared/
|     |- components/
|     |  '- AnimatedPressable.tsx      # Reusable scale-on-press wrapper used across auth/admin buttons
|     |  |- ModuleErrorBoundary.tsx    # Per-module crash isolation boundary with structured render-crash logging
|     '- utils/
|        '- logger.ts                  # Frontend structured logging helper (`appLogger`) used by screens/stores/APIs
|- backend/
|  '- tab1-social/                     # Tab-1 backend package (Lambda + Aurora + S3)
|     |- src/
|     |  |- handler.js                 # Lambda entrypoint; routes social + auth + admin requests (includes POST `/social/posts` delete compatibility action)
|     |  '- lib/
|     |     |- auth.js                 # Resolves current user from Cognito JWT claims or dev headers
|     |     |- authRepository.js       # Account registration/login/profile + admin approval repository layer (immutable profile fields and Cognito sync orchestration)
|     |     |- cognitoOtp.js           # Cognito SignUp/Confirm/Resend OTP plus AdminUpdateUserAttributes profile sync helper
|     |     |- db.js                   # PostgreSQL pool and transaction helper (`withTransaction` export)
|     |     |- errors.js               # `HttpError` abstraction for consistent API errors
|     |     |- hashtags.js             # Caption hashtag extraction + normalization utilities + max-hashtag limit validator
|     |     |- http.js                 # API Gateway response helpers + JSON parsing utilities (CORS allow-methods include DELETE)
|     |     |- logger.js               # Backend structured logging helper for Lambda/runtime errors
|     |     |- media.js                # S3 media URL helpers (`createMediaUploadUrl`, signed read URL resolution)
|     |     |- tokenService.js         # JWT signing, verification, and refresh token hash support
|     |     '- socialRepository.js     # SQL data access layer for feed/posts/hypes/comments/trends with media hydration and live `authorBio` enrichment from `auth.users`
|     |- sql/
|     |  |- 001_setup.sql              # Consolidated DB Schema: auth + social (uuid, visibility, follows, normalized profiles, strict NOT NULL dates)
|     |  '- 002_admin_setup.sql        # Migration: auto-approve and grant admin to 122me0914@nitrkl.ac.in
|     |- scripts/
|     |  '- runMigration.js            # Applies SQL migration using DATABASE_URL
|     |- docs/
|     |  |- api-contract.md            # Endpoint contracts and payload shapes
|     |  '- aws-console-setup.md       # Step-by-step console setup for Lambda/API Gateway/Aurora/S3/Cognito
|     |- .env                          # Local backend environment file for migration/local testing (gitignored)
|     |- .env.example                  # Backend env var template
|     |- package.json                  # Backend dependencies (`pg`, AWS SDK v3) and migrate/check scripts
|     '- README.md                     # Backend usage, route map, and integration notes
|- project_docs/
|  |- architecture.md                  # Tech stack + architecture map
|  |- database_design.md               # Detailed database schema architecture, limitations, and table logic
|  |- file_index.md                    # This file
|  '- active_context.md                # Current task + known issues + next steps
|- .github/
|  |- copilot-instructions.md
|  '- instructions/
|     |- android-first.instructions.md
|     |- social-backend.instructions.md # Backend conventions for Tab-1 Lambda/API/SQL flow
|     '- tab1-env.instructions.md       # Env placement rules for root/backend `.env` files
|  '- skills/
|     '- tab1-social-backend-workflow/
|        '- SKILL.md                   # Repeatable workflow for expanding Tab-1 backend routes safely
|- app.json                            # Expo config (Android-first)
|- .eslintrc.js                        # ESLint config (Expo preset)
|- babel.config.js                     # Expo Router + NativeWind + @ alias
|- expo-env.d.ts                       # Expo-generated TypeScript environment declarations
|- metro.config.js                     # NativeWind metro setup
|- global.css                          # Tailwind directives for NativeWind
|- tailwind.config.js                  # NativeWind/Tailwind content and theme
|- tsconfig.json                       # TypeScript config with path alias
|- package.json                        # Dependencies and scripts (includes `expo-image-picker`, `expo-video`, and `@react-native-community/datetimepicker`)
|- .env                                # Root Expo environment file (`EXPO_PUBLIC_*`, gitignored)
'- index.js                            # expo-router entry
```

## Notes

- Tab-1 backend package is now present under `backend/tab1-social/` and can be deployed as a single Lambda integration behind HTTP API Gateway routes.
- Auth + admin approval APIs now run in the same Lambda package and share the same `{ data: ... }` / `{ error: ... }` envelope convention.
- Auth profile endpoint `PUT /api/v1/auth/profile` updates `name`, `nickname`, `branch`, `bio`, and `interests` for logged-in users.
- Auth profile fields `email`, `birthDate`, and `gender` are immutable after registration and are rejected if sent in profile patch payloads.
- Cognito OTP verification is integrated via `/api/v1/auth/verify-otp` and `/api/v1/auth/resend-otp` when `COGNITO_OTP_ENABLED=true`.
- Cognito profile sync for `name` and `nickname` now uses `AdminUpdateUserAttributes` and requires backend env `COGNITO_USER_POOL_ID` when OTP mode is enabled.
- Admin-approval bypass is now fixed to only `122me0914@nitrkl.ac.in` (auto-approved + admin).
- Registration payload now includes required `name`, `nickname`, `birthDate`, and `gender`; `nickname` is treated as app username.
- Frontend Tab-1 API client supports production HTTP mode plus explicit fallback mock mode when API base URL is not configured.
- Frontend root routing now uses auth state to guard access between `(auth)`, `(tabs)`, and `(admin)` groups.
- Structured logging now exists in both app and backend layers, and most catch paths include file + location + action metadata for easier debugging.
- Auth API diagnostics are hardened: backend auth repository now maps DB schema/connectivity failures to explicit auth error codes and frontend `authApi.ts` now handles non-JSON error bodies with response previews.
- Error payloads now include backend `requestId` when available, enabling direct CloudWatch correlation for failing auth requests.
- Backend env now supports `PG_CONNECT_TIMEOUT_MS` (pg connect timeout tuning) and `EXPOSE_INTERNAL_ERRORS` (temporary debug-only error detail exposure).
- `PG_CONNECT_TIMEOUT_MS` default is now `5000` to avoid masking DB connectivity failures behind 15s Lambda hard timeouts.
- Cognito OTP helper now maps network failures to `COGNITO_NETWORK_UNAVAILABLE` and Managed Login + PrivateLink user-pool mismatch to `COGNITO_PRIVATELINK_DISABLED`; backend docs/env include `COGNITO_MAX_ATTEMPTS` plus private-subnet Cognito egress guidance.
- Root `.env` stores Expo public runtime values for frontend API wiring.
- `backend/tab1-social/.env` stores local backend values and is consumed by `npm run migrate`.
- Backend media helper now accepts `SOCIAL_MEDIA_PUBLIC_BASE_URL` values without scheme by normalizing to `https://` and supports signed read URL generation when feed media points to private S3 objects.
- Tab-1 feed and post-detail responses now hydrate `authorBio` from `auth.users.bio`, so profile bio edits are reflected without recreating posts.
- Tab-1 backend now supports `GET /api/v1/social/users/{userId}/posts` for profile-post listing with the same visibility rules used by feed reads.
- Tab-1 delete post now supports a compatibility path through `POST /api/v1/social/posts` with `{ action: "delete", postId }` when API Gateway is temporarily missing the DELETE route for `/api/v1/social/posts/{postId}`.
- Tab-1 comment mutation now follows one-comment-per-user-per-post semantics (repeat submission edits existing comment).
- Import alias `@/` is enabled via `babel-plugin-module-resolver`.
- Lint setup uses ESLint v8 with legacy `.eslintrc.js` for Expo compatibility.
- Project dependency baseline is now Expo SDK 54.
- Create-post UI now uses device gallery selection (photo/video) and uploads media through `/api/v1/social/media/upload-url` before post creation.
- Create-post now rejects media assets outside aspect ratios `9:16`, `16:9`, `3:4`, `4:3`, `1:1`, `4:5` before upload.
- Create-post photo flow opens a crop window constrained to a selected allowed ratio.
- Feed card UI now shows top author metadata (`name`, `branch`, short `bio`), truncates caption preview, removes bottom hashtag text, and supports in-view muted autoplay with per-video mute/pause controls via `expo-video`.
- Frontend and backend both enforce a maximum of 5 unique hashtags per post caption.
- Video rendering now uses `expo-video` `VideoView` with Android `surfaceType="textureView"` to avoid deprecated `expo-av` warnings and improve clipping/render stability inside feed cards.
- Create-post media upload now supports fallback local file reading for Android `content://` URIs before S3 PUT upload to avoid generic `Network request failed` errors.
- Hype header now has a 3-dot overflow menu with Profile entry; editing is accessed from profile view via dedicated Edit Profile button.
- Hype feed now provides a three-state global video audio mode button: red forced mute, yellow start-muted (unmute allowed), green start-unmuted.
