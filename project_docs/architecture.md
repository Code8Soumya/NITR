# Architecture Documentation

**Last Updated**: 2026-03-29

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

- Frontend scaffold is initialized with Expo Router + TypeScript + NativeWind.
- Tab-1 (Hype Feed) is implemented as an isolated module under `src/modules/hype/`.
- Tab-1 backend is implemented under `backend/tab1-social/` with AWS Lambda-compatible handlers, Aurora SQL repository layer, and S3 pre-signed upload support.
- Tab-1 frontend `hypeApi.ts` now calls `/api/v1/social/*` HTTP endpoints and falls back to in-memory mock mode when `EXPO_PUBLIC_SOCIAL_API_BASE_URL` is missing.
- Tab-2 and Tab-3 are routed placeholders to preserve independent-tab architecture during phased delivery.
- Project dependencies are upgraded to Expo SDK 54 and validated with `expo-doctor`.
- Dependency pins include `react-dom@19.1.0` and `babel-preset-expo@~54.0.10` to keep npm resolution stable with SDK 54.

## Tech Stack

### Frontend
- **Framework**: React Native with Expo Router (file-based routing)
- **SDK**: Expo SDK 54
- **Target Platform**: Android (Primary targeted platform. Code must be optimized for Android APK/AAB distribution, strictly avoiding Web-only DOM APIs).
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand (isolated stores per module)
- **Navigation**: Expo Router file-based routing

### Backend
- **API**: AWS Lambda + API Gateway
- **Database**: Aurora PostgreSQL with pgvector extension
- **Real-time**: AWS AppSync (GraphQL + WebSocket subscriptions)
- **AI/ML**: AWS Bedrock with Titan embeddings (1536 dimensions)
- **Storage**: S3 + CloudFront CDN
- **Auth**: AWS Cognito + SES for OTP

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
- `users` - Core user accounts (linked to Cognito)
- `user_profiles` - Extended profile info (gender, branch, year, bio)
- `user_interests` - User interests for AI matching
- `otp_verifications` - OTP codes for email verification

### Gamification Tables
- `seasons` - 3-month leaderboard seasons
- `user_points` - Aggregate points per user per season
- `point_transactions` - Individual point earning events
- `tier_thresholds` - Point requirements for tiers

### Social Tables (Hype Feed)
- `posts` - User posts (caption, author, visibility metadata)
- `post_media` - Photo/video attachments for posts (S3 key, media type, order)
- `post_hypes` - Likes/hypes on posts
- `comments` - Comments on posts
- `hashtags` - Hashtag tracking

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
- `/auth` - Registration, OTP, login, token refresh
- `/users` - Profile management, blocking
- `/social` - Posts, photo/video upload, hypes, comments, hashtags
- `/campus` - Lost & Found + Q&A endpoints
- `/quests` - Daily quests with real-time chat
- `/leaderboard` - Boys/girls/general leaderboards, tiers
- `/ai` - Peer matches (like, mutual matches)
- `/admin` - User approval, reports, quest creation

**WebSocket**: AppSync subscriptions for quest real-time features (messages, presence, typing indicators)

### Tab-1 Social Endpoints (Implemented)
- `GET /api/v1/social/health`
- `GET /api/v1/social/posts?limit=&cursor=&hashtag=`
- `GET /api/v1/social/posts/{postId}`
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

- **Email Verification**: Users register with @nitrkl.ac.in emails, receive OTP via SES, then await admin approval
- **Social Media Uploads**: Tab 1 supports photo and video uploads via S3 pre-signed URLs and CloudFront delivery; polls are removed from the posting flow
- **Deployment Security Baseline**: Tab-1 backend is intended to run with Lambda in private app subnets, Aurora in private DB subnets, SG-restricted DB access (5432 from Lambda SG only), and least-privilege IAM policies
- **Social Feed Pagination**: Cursor pagination implemented in backend (`nextCursor`) using `(created_at, id)` ordering for deterministic page boundaries
- **Hashtag Indexing**: Captions are parsed server-side and persisted in `social.hashtags` + `social.post_hashtags` for feed filtering and trending queries
- **Hype/Comment Mutations**: Backend performs server-side validation, optimistic-friendly mutation responses, and proper author attribution from auth claims/dev headers
- **WebSocket**: Daily Quest chat uses AppSync subscriptions for real-time messages, presence, and typing indicators
- **Error Handling**: Each module has isolated error boundaries; tab crashes don't affect other tabs
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
