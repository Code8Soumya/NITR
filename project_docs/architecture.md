# Architecture Documentation

**Last Updated**: 2026-04-07

## Application Overview

NITR HUB is a campus social application for NIT Rourkela students with three independent tabs:

1. **Tab 1: Social Media (Hype Feed)** - Posts (text + photos/videos), hypes (likes), comments, hashtags
2. **Tab 2: Campus Utilities (Q&A + Lost & Found)** - Combined feature with gender-filtered sub-tabs:
   - **Boys tab**: Only visible to male users
   - **Girls tab**: Only visible to female users
   - **General tab**: Visible to all users
   - Boys see: Boys + General tabs | Girls see: Girls + General tabs
3. **Tab 3: Daily Quest** - 1-on-1 chat with AI-matched peer:
   - Once per day, matched with one person (profiles visible)
   - Must exchange 30 messages to complete quest
   - After 30 messages: streak += 1 and earn points

Core features: NITR email verification (@nitrkl.ac.in), AI-powered peer matching using vector embeddings, gamification with gender-normalized leaderboards (3-month seasons).

## Implementation Status (Current)

- Memory Bank and Logic Mapping System is deployed automatically tracking full-stack connections to `logic_bridges.md` via `scripts/watch-bridges.js`.
- Frontend scaffold is initialized with Expo Router + TypeScript + NativeWind.
- Tab-1 (Hype Feed) is implemented as an isolated module under `src/modules/hype/`.
- Tab-1 backend is implemented under `backend/tab1-social/` with AWS Lambda-compatible handlers, Aurora SQL repository layer, and S3 pre-signed upload support.
- Production auth and admin-approval flows are implemented in the same backend package (`/api/v1/auth/*`, `/api/v1/admin/*`) with JWT access/refresh tokens, secure password hashing, pending/approved/rejected account states, and Cognito OTP verification for registration.
  - **AWS Cognito PrivateLink strict constraint**: Do NOT enable "Managed Login" (Hosted UI) in the AWS Cognito User Pool. AWS PrivateLink (VPC Interface Endpoints for `cognito-idp`) throws `INVALID_COGNITO_PARAMETERS` regarding PrivateLink API access if Managed Login is enabled on the domain.
- Cognito OTP in private-subnet Lambda supports either NAT egress to public `cognito-idp` or `com.amazonaws.<region>.cognito-idp` interface endpoint with user-pool PrivateLink enabled.
- Database is natively optimized with Postgres-specific `uuid`, `timestamptz`, Array, and CHECK (`visibility`) features. Data like `author_name` is heavily normalized and extracted purely via `JOIN`s against `auth.users`.
- Auth registration now captures Cognito-required attributes (`name`, `nickname`, `birthDate`, `gender`) and app profile fields (`bio`, `interests`) in PostgreSQL. `birth_date` is enforced strictly as a `NOT NULL` required field at the database level.
- Post feeds restrict row delivery based on a cross-join against `social.follows` matching the author's defined `visibility` rule (`public`, `followers`, `connections`).
- Auth profile updates now support `name`, `nickname`, `branch`, `bio`, and `interests` while keeping `email`, `birthDate`, and `gender` immutable after signup.
- Register screen now uses calendar-based birthdate selection via `@react-native-community/datetimepicker` to avoid malformed date input.
- Tab-1 frontend `hypeApi.ts` now calls `/api/v1/social/*` HTTP endpoints and falls back to in-memory mock mode when `EXPO_PUBLIC_SOCIAL_API_BASE_URL` is missing.
- Tab-1 create-post flow now uses `expo-image-picker` to select local photo/video media and uploads binary files via `/api/v1/social/media/upload-url` before creating the post.
- Tab-1 create-post upload now supports Android `content://` and `file://` local URIs reliably by using blob-fallback loading before S3 PUT upload to prevent intermittent `Network request failed` errors.
- Tab-1 create-post now enforces allowed media aspect ratios (`9:16`, `16:9`, `3:4`, `4:3`, `1:1`, `4:5`) for photos/videos and opens a photo crop window with the selected target ratio before upload.
- Tab-1 feed cards now render both photos and videos with aspect-ratio-aware containers, contain-fit media rendering, muted autoplay while in-view, and explicit mute/pause controls on video posts.
- Tab-1 video playback is migrated from deprecated `expo-av` `Video` to `expo-video` (`VideoView` + `useVideoPlayer`) to eliminate SDK warnings and improve Android rendering reliability.
- Tab-1 Hype feed now has a global three-state video audio mode: red = force-muted (cannot unmute), yellow = start-muted (manual unmute allowed), green = start-unmuted.
- Tab-1 Hype header overflow menu now uses a Profile shortcut (instead of direct edit), with editing moved to a dedicated in-profile action.
- Tab-1 post creation now enforces a maximum of 5 unique hashtags per caption in both frontend and backend validation.
- Tab-1 social read APIs (`GET /api/v1/social/posts`, `GET /api/v1/social/users/{userId}/posts`, `GET /api/v1/social/posts/{postId}`) hydrate `authorBio` from `auth.users.bio` so feed/header metadata reflects current profile bio.
- Tab-1 backend now enforces one comment per user per post: repeated comment submissions update the existing comment instead of creating duplicates.
- Tab-1 media hydration now resolves S3-backed media into signed read URLs when needed, and media public base URL handling auto-normalizes missing schemes to keep feed images renderable.
- Frontend now has a dedicated auth module (`src/modules/auth/`) with SecureStore-backed token persistence, login/register/pending-approval screens, admin approvals UI, profile editing screen, and route guards across auth/tabs/admin groups.
- Frontend and backend now use centralized structured logging helpers (`src/shared/utils/logger.ts` and `backend/tab1-social/src/lib/logger.js`) so runtime failures include file, function/location, operation, and stack/root-cause context.
- Tab-2 and Tab-3 are routed placeholders to preserve independent-tab architecture during phased delivery.
- Project dependencies are upgraded to Expo SDK 54 and validated with `expo-doctor`.
- Dependency pins include `react-dom@19.1.0` and `babel-preset-expo@~54.0.10` to keep npm resolution stable with SDK 54.

## Tech Stack

### Frontend
- **Framework**: React Native with Expo Router (file-based routing)
- **SDK**: Expo SDK 54
- **Target Platform**: Android (Primary targeted platform. Code must be optimized for Android APK/AAB distribution, strictly avoiding Web-only DOM APIs).
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Media Selection**: expo-image-picker
- **Video Playback**: expo-video
- **Date Selection**: @react-native-community/datetimepicker
- **State Management**: Zustand (isolated stores per module)
- **Navigation**: Expo Router file-based routing

### Backend
- **API**: AWS Lambda + API Gateway
- **Database**: Aurora PostgreSQL with pgvector extension
- **Real-time**: AWS AppSync (GraphQL + WebSocket subscriptions)
- **AI/ML**: AWS Bedrock with Titan embeddings (1536 dimensions)
- **Storage**: S3 + CloudFront CDN
- **Auth**: JWT access/refresh sessions + bcrypt password hashing + Cognito OTP verification

## Module Isolation Architecture

Each tab operates independently with its own Zustand store to ensure fault tolerance. If one tab crashes, others continue working. Each tab is wrapped in an ErrorBoundary component.

### Module Structure
- `src/modules/auth/` - Authentication
- `src/modules/hype/` - Tab 1 (social feed)
- `src/modules/campus/` - Tab 2 (lost-found + Q&A)
- `src/modules/quest/` - Tab 3 (daily chat)
- `src/modules/leaderboard/` - Gamification
- `src/modules/matching/` - AI peer matching

Each module contains:
- `api/` - API client functions
- `hooks/` - React hooks
- `store/` - Zustand store (isolated, with persistence)
- `components/` - UI components

## Database Schema

### Auth Tables
- `auth.users` - Core app accounts (approval state, admin flags, Cognito OTP verification fields, `full_name`, `nickname`, `birth_date`, `gender`, `bio`, `interests`)
- `auth.refresh_sessions` - Rotating refresh-token sessions (hashed token, expiry, revocation)

### Gamification Tables
- `seasons` - 3-month leaderboard seasons
- `user_points` - Aggregate points per user per season
- `point_transactions` - Individual point earning events
- `tier_thresholds` - Point requirements for tiers

### Social Tables (Hype Feed)
- `posts` - User posts (caption, author reference, `visibility` setting for public/followers/connections)
- `post_media` - Photo/video attachments for posts (S3 key, media type, order)
- `post_hypes` - Likes/hypes on posts
- `comments` - Comments on posts
- `hashtags` - Hashtag tracking
- `follows` - User followers/following relationships

### Campus Tables (Tab 2: Q&A + Lost & Found with Sub-tabs)
- `lost_found_items` - Lost & Found posts (with visibility_gender for sub-tab filtering)
- `questions` - Q&A questions (with visibility_gender for sub-tab filtering)
- `answers` - Q&A answers
- `answer_votes` - Upvotes/downvotes on answers

**visibility_gender values**: NULL = General tab, 'male' = Boys tab, 'female' = Girls tab

### Quest Tables (Tab 3: Daily Quest - 1-on-1 Matching)
- `daily_quest_matches` - Daily user pairings (user1, user2, message_count, completed_at)
- `quest_messages` - Chat messages between matched pairs
- `quest_streaks` - User streak tracking (current, longest, total completed)

### AI Tables
- `user_matches` - Peer matches with vector embeddings (1536-dim using pgvector)

**Vector Indexes**: Use HNSW algorithm
```sql
CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)
```

## Gender-Normalized Leaderboard

Three separate leaderboards:
- **Boys** - Raw points
- **Girls** - Raw points
- **General** - Normalized using Z-score + percentile hybrid

### Normalization Formula
Prevents bias toward larger gender group:
```
normalized_score = 0.6 * scaled_z_score + 0.4 * percentile

where:
  z_score = (user_points - gender_mean) / gender_std_dev
  scaled_z_score = ((clamp(z_score, -3, 3) + 3) / 6) * 100
  percentile = ((group_count - rank_in_group) / group_count) * 100
```

**Display Formula**: `Skill Rating = 1000 + (normalized_score - 50) * 20`

**Implementation**: `src/modules/leaderboard/utils/normalization.ts` + SQL function for server-side calculation

## Navigation Map

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   └── verify-otp.tsx
├── (onboarding)/
│   └── setup-profile.tsx
├── (tabs)/
│   ├── _layout.tsx (Tab Navigator)
│   ├── hype/
│   │   ├── index.tsx (Feed)
│   │   ├── create.tsx (Create post)
│   │   ├── profile.tsx (Profile view + posts + edit-profile CTA)
│   │   ├── edit-profile.tsx (Profile editor)
│   │   └── [postId].tsx (Post detail)
│   ├── campus/
│   │   ├── index.tsx (Q&A + Lost&Found with Boys/Girls/General sub-tabs)
│   │   ├── lost-found/
│   │   │   ├── [itemId].tsx (Item detail)
│   │   │   └── create.tsx (Report item)
│   │   └── qa/
│   │       ├── [questionId].tsx (Question detail)
│   │       └── ask.tsx (Ask question)
│   └── quest/
│       ├── index.tsx (Daily quest - matching status)
│       └── chat.tsx (1-on-1 chat with matched partner)
├── (leaderboard)/
│   └── index.tsx
└── (admin)/
    ├── approvals.tsx
    └── reports.tsx
```

## API Structure

**Base URL**: `/api/v1`

### Endpoints
- `/auth` - Registration, login, token refresh, profile
- `/users` - Profile management, blocking
- `/social` - Posts, photo/video upload, hypes, comments, hashtags
- `/campus` - Lost & Found + Q&A endpoints
- `/quests` - Daily quests with real-time chat
- `/leaderboard` - Boys/girls/general leaderboards, tiers
- `/ai` - Peer matches (like, mutual matches)
- `/admin` - User approval, reports, quest creation

### Auth + Admin Endpoints (Implemented)
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/resend-otp`
- `PUT /api/v1/auth/profile`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/admin/approvals/pending`
- `POST /api/v1/admin/approvals/{userId}/approve`
- `POST /api/v1/admin/approvals/{userId}/reject`

**WebSocket**: AppSync subscriptions for quest real-time features (messages, presence, typing indicators)

### Tab-1 Social Endpoints (Implemented)
- `GET /api/v1/social/health`
- `GET /api/v1/social/posts?limit=&cursor=&hashtag=`
- `GET /api/v1/social/users/{userId}/posts?limit=&cursor=`
- `GET /api/v1/social/posts/{postId}`
- `DELETE /api/v1/social/posts/{postId}`
- `POST /api/v1/social/posts`
- `POST /api/v1/social/posts/{postId}/hypes`
- `POST /api/v1/social/posts/{postId}/comments`
- `GET /api/v1/social/hashtags/trending?limit=`
- `POST /api/v1/social/media/upload-url`

### Tab-1 Data Flow (Implemented)
- Lambda handler entrypoint: `backend/tab1-social/src/handler.js`
- SQL/repository layer: `backend/tab1-social/src/lib/socialRepository.js`
- Migration: `backend/tab1-social/sql/001_tab1_social.sql`
- Frontend client: `src/modules/hype/api/hypeApi.ts`
- Store integration: `src/modules/hype/store/hypeStore.ts`

## Key Implementation Details

- **NITR Domain Registration**: Users register with @nitrkl.ac.in emails and await admin approval before social access.
- **Nickname-First Identity**: `nickname` is the in-app username and is required at signup; full name is stored separately as `name`.
- **Cognito OTP Verification**: When enabled, registration sends Cognito OTP to email; login is blocked until OTP confirmation succeeds.
- **Profile Enrichment**: `bio` and `interests` can be provided at signup and updated later via `PUT /api/v1/auth/profile`; profile updates also support `name`, `nickname`, and `branch`.
- **Live Author Bio in Feed**: Feed/detail post responses hydrate `authorBio` from `auth.users.bio` at read-time rather than relying only on post snapshot fields.
- **Immutable Profile Fields**: `email`, `birthDate`, and `gender` are locked after registration and rejected in profile patch requests.
- **Account Approval Gate**: Every new account starts pending admin approval except `122me0914@nitrkl.ac.in`, which is auto-approved and marked admin.
- **Cognito Profile Sync**: When OTP mode is enabled, profile updates sync `name` and `nickname` to Cognito using `AdminUpdateUserAttributes` (requires `COGNITO_USER_POOL_ID`).
- **Social Media Uploads**: Tab 1 supports photo and video uploads via gallery selection on create-post, S3 pre-signed uploads, and CloudFront delivery; manual media URL entry is removed from the primary posting flow.
- **Media Aspect Policy (Frontend)**: Users can submit only `9:16`, `16:9`, `3:4`, `4:3`, `1:1`, or `4:5` assets from gallery pick flow, and photo picks use a crop window constrained to the selected allowed ratio.
- **Feed Video UX**: Videos autoplay muted when cards become visible in feed viewport, media uses contain-fit rendering for both photos/videos, and users can reliably toggle mute/pause per card.
- **Hashtag Limit Rule**: Captions can include at most 5 unique hashtags; backend rejects overflow with `HASHTAG_LIMIT_EXCEEDED`.
- **Comment Upsert Rule**: For Tab-1 comments, each user can keep only one comment per post; submitting again updates that existing comment.
- **Media Read Resilience**: Feed/detail media URIs are normalized and can be signed for read access from S3-backed object keys to avoid invisible photos caused by inaccessible direct object URLs.
- **Deployment Security Baseline**: Tab-1 backend is intended to run with Lambda in private app subnets, Aurora in private DB subnets, SG-restricted DB access (5432 from Lambda SG only), and least-privilege IAM policies
- **Cognito Runtime Network Requirement**: When `COGNITO_OTP_ENABLED=true`, Lambda must have outbound HTTPS access to Cognito IDP (`cognito-idp`) via NAT egress or an interface VPC endpoint in private-subnet deployments.
- **Social Feed Pagination**: Cursor pagination implemented in backend (`nextCursor`) using `(created_at, id)` ordering for deterministic page boundaries
- **Hashtag Indexing**: Captions are parsed server-side and persisted in `social.hashtags` + `social.post_hashtags` for feed filtering and trending queries
- **Hype/Comment Mutations**: Backend performs server-side validation, optimistic-friendly mutation responses, and proper author attribution from auth claims/dev headers
- **Delete Post Resilience**: Profile post delete uses primary `DELETE /api/v1/social/posts/{postId}` and supports compatibility fallback through `POST /api/v1/social/posts` with `{ action: "delete", postId }` when API Gateway DELETE routing is not yet configured.
- **WebSocket**: Daily Quest chat uses AppSync subscriptions for real-time messages, presence, and typing indicators
- **Error Handling**: Each module has isolated error boundaries; tab crashes don't affect other tabs
- **Observability Logging**: Root layout installs a global JS error handler; all major catch paths in auth/hype frontend and Tab-1 backend now emit structured logs with file-level context, request metadata (requestId/method/path), and serialized error details.
- **AI Matching**: User profiles and interests converted to 1536-dim vectors using Bedrock Titan, matched using cosine similarity via pgvector for Daily Quest pairing
- **Gender-Filtered Sub-tabs**: Tab 2 (Q&A + Lost & Found) has Boys/Girls/General sub-tabs. Content has `visibility_gender` field to control which sub-tab it appears in. Boys see Boys+General, Girls see Girls+General.
- **Daily Quest**: 1-on-1 AI-matched chat, once per day, 30 messages to complete, profiles visible from start
- **Tiers**: 5 levels (observer, junior_engineer, senior_engineer, architect, legend_of_nitr) based on points

## Testing Strategy

- Unit tests for utility functions (especially `normalization.ts`)
- Tab-1 social backend smoke tests for create/list/hype/comment/upload-url routes after each deployment
- Module isolation tests (disable tabs individually, verify others work)
- Real-time chat load testing (100+ concurrent users)
- Security validation for OTP flow, gender-gated content, admin permissions
