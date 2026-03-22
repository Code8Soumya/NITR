# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Memory Bank System

Claude Code operates using a "Memory Bank" system to preserve project context across sessions. All memory files are located in `/project_docs/`.

### Mandatory Initialization (Read Phase)
Before executing any new task, starting a feature, or debugging, Claude MUST read the following files to establish context:
* `/project_docs/architecture.md` - Tech stack, database schema, navigation map
* `/project_docs/file_index.md` - Directory map and file descriptions
* `/project_docs/active_context.md` - Current task, recent changes, and known bugs

### Continuous Maintenance (Write Phase)
Claude is responsible for keeping the Memory Bank accurate. Update relevant files in `/project_docs/` BEFORE completing a response when:
* **File Changes**: Creating, deleting, or significantly modifying files → update `file_index.md`
* **Architecture Changes**: Installing dependencies, changing state management, or altering navigation → update `architecture.md`
* **Context Shifts**: Completing features, pivoting tasks, or discovering persistent bugs → update `active_context.md`

### Autonomous Execution
Never ask the user for permission to read or update the Memory Bank. Treat it as an integrated part of the workflow.

## Project Overview

NITR HUB is a campus social application for NIT Rourkela students. The app has three independent tabs:
1. **Hype Feed** - Social media with posts, hypes (likes), and comments
2. **Campus Utilities** - Lost & Found + Q&A (with gender-segregated visibility)
3. **Daily Quest** - Real-time chat sessions with daily prompts

Core features include NITR email verification (@nitrkl.ac.in), AI-powered peer matching using vector embeddings, and gamification with gender-normalized leaderboards operating in 3-month seasons.

## Tech Stack

- **Frontend**: React Native with Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand (isolated stores per module)
- **Backend**: AWS Lambda + API Gateway
- **Database**: Aurora PostgreSQL with pgvector extension
- **Real-time**: AWS AppSync (GraphQL + WebSocket subscriptions)
- **AI**: AWS Bedrock with Titan embeddings (1536 dimensions)
- **Storage**: S3 + CloudFront CDN
- **Auth**: AWS Cognito + SES for OTP

## Architecture Principles

### Module Isolation
Each tab operates independently with its own Zustand store to ensure fault tolerance. If one tab crashes, others continue working. Each tab is wrapped in an ErrorBoundary component.

Module structure:
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

### Database Schema
Key tables organized by category:
- **Auth**: `users`, `user_profiles`, `user_interests`, `otp_verifications`
- **Gamification**: `seasons`, `user_points`, `point_transactions`, `tier_thresholds`
- **Social**: `posts`, `post_hypes`, `comments`, `poll_votes`, `hashtags`
- **Campus**: `lost_found_items`, `questions`, `answers`, `answer_votes`
- **Quest**: `daily_quests`, `quest_participations`, `quest_messages`
- **AI**: `user_matches` (uses vector embeddings via pgvector)

Vector indexes use HNSW algorithm: `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`

### Gender-Normalized Leaderboard
Three separate leaderboards:
- Boys (raw points)
- Girls (raw points)
- General (normalized using Z-score + percentile hybrid)

**Normalization formula** (prevents bias toward larger gender group):
```
normalized_score = 0.6 * scaled_z_score + 0.4 * percentile

where:
  z_score = (user_points - gender_mean) / gender_std_dev
  scaled_z_score = ((clamp(z_score, -3, 3) + 3) / 6) * 100
  percentile = ((group_count - rank_in_group) / group_count) * 100
```

Display to users as Skill Rating: `1000 + (normalized_score - 50) * 20`

Implementation in `src/modules/leaderboard/utils/normalization.ts` and mirrored as SQL function for server-side calculation.

## Project Structure

```
nitr-hub/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Login, register, verify-otp
│   ├── (onboarding)/             # Profile setup
│   ├── (tabs)/                   # Main 3-tab navigator
│   │   ├── hype/                 # Tab 1
│   │   ├── campus/               # Tab 2
│   │   └── quest/                # Tab 3
│   ├── (leaderboard)/
│   └── (admin)/
├── src/
│   ├── modules/                  # Feature modules (see above)
│   ├── shared/                   # Shared UI components, hooks, utils
│   ├── services/                 # API client, WebSocket, token management
│   └── providers/                # React context providers
```

## Key Implementation Notes

- **Email Verification**: Users register with @nitrkl.ac.in emails, receive OTP via SES, then await admin approval
- **WebSocket**: Quest chat uses AppSync subscriptions for real-time messages, presence, and typing indicators
- **Error Handling**: Each module has isolated error boundaries; tab crashes don't affect other tabs
- **AI Matching**: User profiles and interests are converted to 1536-dim vectors using Bedrock Titan, then matched using cosine similarity via pgvector
- **Gender-Gated Content**: Q&A questions have `visibility_gender` field (NULL=all, 'male', 'female')
- **Tiers**: 5 tier levels (observer, junior_engineer, senior_engineer, architect, legend_of_nitr) based on points

## Development Commands

*Note: Commands will be added once project is initialized*

## API Structure

Base URL: `/api/v1`

Main modules:
- `/auth` - Registration, OTP, login, token refresh
- `/users` - Profile management, blocking
- `/social` - Posts, hypes, comments, hashtags
- `/campus` - Lost & Found + Q&A endpoints
- `/quests` - Daily quests with real-time chat
- `/leaderboard` - Boys/girls/general leaderboards, tiers
- `/ai` - Peer matches (like, mutual matches)
- `/admin` - User approval, reports, quest creation

WebSocket subscriptions via AppSync for quest real-time features.

## Testing Strategy

- Unit tests for utility functions (especially `normalization.ts`)
- Module isolation tests (disable tabs individually, verify others work)
- Real-time chat load testing (100+ concurrent users)
- Security validation for OTP flow, gender-gated content, admin permissions
