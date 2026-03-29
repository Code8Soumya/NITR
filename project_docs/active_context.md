# Active Context

**Last Updated**: 2026-03-29

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

1. Deploy `backend/tab1-social` Lambda and map all `/api/v1/social/*` routes in API Gateway.
2. Switch from dev headers to Cognito JWT bearer token flow in frontend auth module.
3. Fill root `.env` and `backend/tab1-social/.env` with real AWS values before first deployment test.
4. Add cursor pagination support to frontend feed using backend `nextCursor`.
5. Add automated tests for repository layer and API route handlers.

## Blockers & Decisions Needed

- AWS account setup is required: Aurora connectivity, Lambda deployment, API Gateway routes, and Cognito authorizer binding.

## Technical Debt

- `src/modules/hype/api/hypeApi.ts` still includes mock fallback path for local development.
- Feed UI currently loads a single page and does not consume backend cursor pagination.

## Performance Notes

- Backend feed query uses indexed `(created_at, id)` cursor pagination and hashtag joins; frontend pagination adoption is pending.

## Security Considerations

- Disable `ENABLE_DEV_HEADERS` in production after Cognito authorizer is attached.
- Move `DATABASE_URL` out of plaintext Lambda env and into Secrets Manager/Parameter Store.
