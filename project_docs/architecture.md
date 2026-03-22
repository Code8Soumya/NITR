# Architecture Documentation

**Last Updated**: 2026-03-22

## Application Overview

NITR HUB is a campus social application for NIT Rourkela students with three independent tabs:
1. **Hype Feed** - Social media with posts, hypes (likes), and comments
2. **Campus Utilities** - Lost & Found + Q&A (with gender-segregated visibility)
3. **Daily Quest** - Real-time chat sessions with daily prompts

Core features: NITR email verification (@nitrkl.ac.in), AI-powered peer matching using vector embeddings, gamification with gender-normalized leaderboards (3-month seasons).

## Tech Stack

### Frontend
- **Framework**: React Native with Expo Router (file-based routing)
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
- `posts` - User posts (text, images, polls)
- `post_hypes` - Likes/hypes on posts
- `comments` - Comments on posts
- `poll_votes` - Poll voting records
- `hashtags` - Hashtag tracking

### Campus Tables
- `lost_found_items` - Lost & Found posts
- `questions` - Q&A questions (with gender visibility)
- `answers` - Q&A answers
- `answer_votes` - Upvotes/downvotes on answers

### Quest Tables
- `daily_quests` - Daily chat prompts/topics
- `quest_participations` - User participation records
- `quest_messages` - Chat messages (real-time)

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
│   │   └── [postId].tsx (Post detail)
│   ├── campus/
│   │   ├── index.tsx (Lost&Found + Q&A tabs)
│   │   ├── lost-found/[itemId].tsx
│   │   └── questions/[questionId].tsx
│   └── quest/
│       ├── index.tsx (Daily quest lobby)
│       └── [questId].tsx (Chat room)
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
- `/social` - Posts, hypes, comments, hashtags
- `/campus` - Lost & Found + Q&A endpoints
- `/quests` - Daily quests with real-time chat
- `/leaderboard` - Boys/girls/general leaderboards, tiers
- `/ai` - Peer matches (like, mutual matches)
- `/admin` - User approval, reports, quest creation

**WebSocket**: AppSync subscriptions for quest real-time features (messages, presence, typing indicators)

## Key Implementation Details

- **Email Verification**: Users register with @nitrkl.ac.in emails, receive OTP via SES, then await admin approval
- **WebSocket**: Quest chat uses AppSync subscriptions for real-time messages, presence, and typing indicators
- **Error Handling**: Each module has isolated error boundaries; tab crashes don't affect other tabs
- **AI Matching**: User profiles and interests converted to 1536-dim vectors using Bedrock Titan, matched using cosine similarity via pgvector
- **Gender-Gated Content**: Q&A questions have `visibility_gender` field (NULL=all, 'male', 'female')
- **Tiers**: 5 levels (observer, junior_engineer, senior_engineer, architect, legend_of_nitr) based on points

## Testing Strategy

- Unit tests for utility functions (especially `normalization.ts`)
- Module isolation tests (disable tabs individually, verify others work)
- Real-time chat load testing (100+ concurrent users)
- Security validation for OTP flow, gender-gated content, admin permissions
