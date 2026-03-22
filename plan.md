# NITR HUB - Technical Architecture Plan

## Context

NITR HUB is a campus social application for NIT Rourkela students with three core features: Social Media (Hype Feed), Campus Utilities (Lost & Found + Q&A), and Daily Quest Chat. The app requires:
- Modular architecture where tabs work independently (fault-tolerant)
- NITR email verification (@nitrkl.ac.in) with admin approval
- AI-powered peer matching using vector embeddings
- Gamification with gender-normalized leaderboards
- 3-month competitive seasons

**Tech Choices:**
- UI Library: **NativeWind** (Tailwind CSS for React Native)
- Email Domain: **@nitrkl.ac.in**

This plan provides the complete technical specification including database schema, API endpoints, folder structure, and leaderboard normalization algorithm.

---

## 1. Database Schema (Aurora PostgreSQL + pgvector)

### 1.1 Core Tables

| Category | Tables |
|----------|--------|
| **Auth & Users** | `users`, `user_profiles`, `user_interests`, `otp_verifications`, `user_sessions` |
| **Gamification** | `seasons`, `user_points`, `point_transactions`, `tier_thresholds` |
| **Social (Tab 1)** | `posts`, `post_hypes`, `comments`, `comment_hypes`, `poll_votes`, `post_bookmarks`, `hashtags`, `post_hashtags` |
| **Campus (Tab 2)** | `lost_found_items`, `lost_found_claims`, `questions`, `answers`, `answer_votes`, `question_votes` |
| **Quest (Tab 3)** | `daily_quests`, `quest_participations`, `quest_messages`, `quest_presence` |
| **AI/Matching** | `user_matches`, `content_recommendations` |
| **Admin** | `reports`, `user_bans`, `admin_actions`, `notifications`, `push_subscriptions` |

### 1.2 Key Schema Highlights

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for AI matching

-- User status flow
CREATE TYPE user_status AS ENUM ('pending_verification', 'pending_approval', 'active', 'suspended', 'banned');

-- Tier levels
CREATE TYPE tier_level AS ENUM ('observer', 'junior_engineer', 'senior_engineer', 'architect', 'legend_of_nitr');

-- Vector embeddings (1536 dims for Amazon Titan)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    interest_embedding vector(1536),
    profile_embedding vector(1536),
    -- ... other fields
);

-- HNSW indexes for fast vector search
CREATE INDEX idx_profile_embedding ON user_profiles
    USING hnsw (profile_embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

### 1.3 Gender-Segregated Q&A
```sql
CREATE TABLE questions (
    visibility_gender gender_type,  -- NULL = all, 'male' = boys only, 'female' = girls only
    -- ...
);
```

---

## 2. API Endpoints by Module

### 2.1 Authentication (`/api/v1/auth`)
```
POST /register              # Register with NITR email
POST /verify-otp            # Verify email OTP
POST /login                 # Login with email/password
POST /refresh-token         # Refresh JWT
GET  /me                    # Current user info
```

### 2.2 User Profile (`/api/v1/users`)
```
GET/PUT /profile            # Get/update profile
PUT  /profile/interests     # Update interests
GET  /:userId               # View user profile
POST /block/:userId         # Block user
```

### 2.3 Social Media - Tab 1 (`/api/v1/social`)
```
GET  /feed                  # Personalized feed (?filter=trending|latest)
POST /posts                 # Create post
POST /posts/:id/hype        # Hype a post
POST /posts/:id/hype-down   # Hype down a post
GET  /posts/:id/comments    # Get comments
POST /posts/:id/comments    # Add comment
GET  /hashtags/trending     # Trending hashtags
```

### 2.4 Campus Utilities - Tab 2 (`/api/v1/campus`)
```
# Lost & Found
GET  /lost-found            # List items (?type=lost|found&gender_filter=)
POST /lost-found            # Report item
POST /lost-found/:id/claim  # Submit claim
GET  /lost-found/:id/matches # AI-matched items

# Q&A
GET  /questions             # List (?category=&gender_filter=male|female|all)
POST /questions             # Ask question
POST /questions/:id/answers # Post answer
PUT  /answers/:id/accept    # Accept answer
```

### 2.5 Daily Quest - Tab 3 (`/api/v1/quests`)
```
GET  /today                 # Today's quest
POST /:id/join              # Join quest chat
GET  /:id/messages          # Get messages (paginated)
POST /:id/messages          # Send message

# WebSocket (AppSync)
WS /quests/:id/subscribe    # Real-time messages
WS /quests/:id/presence     # Online users
WS /quests/:id/typing       # Typing indicators
```

### 2.6 Leaderboard (`/api/v1/leaderboard`)
```
GET /boys                   # Boys leaderboard (raw points)
GET /girls                  # Girls leaderboard (raw points)
GET /general                # General leaderboard (normalized)
GET /me                     # My rank & stats
GET /tiers                  # Tier definitions & thresholds
```

### 2.7 AI Matching (`/api/v1/ai`)
```
GET  /matches               # AI-suggested peer matches
POST /matches/:id/like      # Like a match
GET  /matches/mutual        # Mutual matches
```

### 2.8 Admin (`/api/v1/admin`)
```
GET  /users/pending         # Users awaiting approval
POST /users/:id/approve     # Approve user
POST /users/:id/reject      # Reject user
GET  /reports               # Content reports
PUT  /reports/:id           # Review report
POST /quests                # Create daily quest
```

---

## 3. React Native Expo Folder Structure

```
nitr-hub/
├── app/                              # Expo Router (file-based routing)
│   ├── _layout.tsx                   # Root layout (providers)
│   ├── global.css                    # NativeWind/Tailwind styles
│   ├── (auth)/                       # Auth screens (login, register, verify-otp)
│   ├── (onboarding)/                 # Profile setup flow
│   ├── (tabs)/                       # Main tab navigator
│   │   ├── _layout.tsx               # Tab bar config
│   │   ├── hype/                     # Tab 1: Social Media
│   │   │   ├── index.tsx             # Feed
│   │   │   ├── create.tsx            # Create post
│   │   │   └── [postId].tsx          # Post detail
│   │   ├── campus/                   # Tab 2: Campus Utilities
│   │   │   ├── lost-found/           # Lost & Found screens
│   │   │   └── qa/                   # Q&A screens
│   │   └── quest/                    # Tab 3: Daily Quest
│   │       ├── index.tsx             # Today's quest
│   │       └── chat.tsx              # Quest chat room
│   ├── (leaderboard)/                # Leaderboard screens
│   ├── (admin)/                      # Admin panel
│   └── (matches)/                    # AI matching screens
│
├── src/
│   ├── modules/                      # MODULAR ARCHITECTURE (key for isolation)
│   │   ├── auth/                     # Auth module
│   │   │   ├── api/authApi.ts
│   │   │   ├── hooks/useAuth.ts
│   │   │   ├── store/authStore.ts    # Zustand store (isolated)
│   │   │   └── components/
│   │   ├── hype/                     # Tab 1 module (isolated)
│   │   │   ├── api/postsApi.ts
│   │   │   ├── hooks/useFeed.ts
│   │   │   ├── store/feedStore.ts
│   │   │   └── components/PostCard.tsx
│   │   ├── campus/                   # Tab 2 module (isolated)
│   │   │   ├── lost-found/           # Sub-module
│   │   │   └── qa/                   # Sub-module
│   │   ├── quest/                    # Tab 3 module (isolated)
│   │   │   ├── services/websocketService.ts
│   │   │   └── store/chatStore.ts
│   │   ├── leaderboard/              # Leaderboard module
│   │   │   └── utils/normalization.ts # Z-score calculation
│   │   └── matching/                 # AI matching module
│   │
│   ├── shared/                       # Shared across modules
│   │   ├── components/ui/            # NativeWind components (Button, Input, Card, ErrorBoundary)
│   │   ├── hooks/                    # useDebounce, useNetworkStatus
│   │   └── utils/                    # formatters, validators
│   │
│   ├── services/                     # Core services
│   │   ├── api/client.ts             # Axios setup
│   │   ├── realtime/websocket.ts     # WebSocket manager
│   │   └── auth/tokenManager.ts
│   │
│   └── providers/                    # Context providers
│       └── AppProviders.tsx          # Combines all providers
```

### Module Isolation Strategy

Each tab module has its **own Zustand store** to ensure independence:

```typescript
// src/modules/hype/store/feedStore.ts
export const useFeedStore = create<FeedState>()(
  persist(
    (set) => ({
      posts: [],
      filter: 'latest',
      // ... actions
    }),
    { name: 'hype-feed-store' }
  )
);
```

**Error Boundaries** wrap each tab to prevent crashes from propagating:

```tsx
// app/(tabs)/_layout.tsx
<ErrorBoundary fallback={<TabErrorFallback />}>
  <HypeTabScreen />
</ErrorBoundary>
```

---

## 4. General Leaderboard Normalization Algorithm

### Problem
Raw point totals bias toward the larger gender group (typically males in engineering colleges). A fair General Leaderboard must normalize scores.

### Solution: Z-Score + Percentile Hybrid

**Formula:**
```
normalized_score = 0.6 * scaled_z_score + 0.4 * percentile

where:
  z_score = (user_points - gender_mean) / gender_std_dev
  scaled_z_score = ((clamp(z_score, -3, 3) + 3) / 6) * 100
  percentile = ((group_count - rank_in_group) / group_count) * 100
```

### Implementation

```typescript
// src/modules/leaderboard/utils/normalization.ts

export function normalizeLeaderboard(users: UserScore[]): UserScore[] {
  // 1. Calculate stats per gender
  const maleStats = calculateGenderStats(users, 'male');
  const femaleStats = calculateGenderStats(users, 'female');

  // 2. Calculate normalized scores
  return users.map(user => {
    const stats = user.gender === 'male' ? maleStats : femaleStats;

    const zScore = (user.totalPoints - stats.mean) / stats.stdDev;
    const scaledZ = ((Math.max(-3, Math.min(3, zScore)) + 3) / 6) * 100;
    const percentile = ((stats.count - user.rankInGroup) / stats.count) * 100;

    return {
      ...user,
      normalizedScore: 0.6 * scaledZ + 0.4 * percentile,
    };
  }).sort((a, b) => b.normalizedScore - a.normalizedScore);
}
```

### SQL Function (Server-Side)

```sql
CREATE FUNCTION calculate_normalized_leaderboard(p_season_id UUID)
RETURNS TABLE (...) AS $$
WITH gender_stats AS (
    SELECT gender, AVG(total_points) as mean, STDDEV(total_points) as std_dev, COUNT(*) as count
    FROM user_points JOIN user_profiles ON ...
    GROUP BY gender
),
normalized AS (
    SELECT *,
        0.6 * (((LEAST(GREATEST(z_score, -3), 3) + 3) / 6) * 100) +
        0.4 * ((group_count - gender_rank) / group_count * 100) AS normalized_score
    FROM ...
)
SELECT *, RANK() OVER (ORDER BY normalized_score DESC) as general_rank
FROM normalized;
$$
```

### Display to Users
```
Skill Rating = 1000 + (normalized_score - 50) * 20
// Ranges from ~0 to ~2000, with 1000 being average
```

---

## 5. AWS Architecture Summary

| Service | Purpose |
|---------|---------|
| **API Gateway** | REST API routing |
| **Lambda** | Serverless functions (auth, social, campus, quest, admin) |
| **Aurora PostgreSQL** | Main database with pgvector |
| **AppSync** | GraphQL + WebSocket subscriptions (real-time chat) |
| **Bedrock** | AI embeddings (Titan) for matching |
| **S3 + CloudFront** | Media storage & CDN |
| **Cognito** | User authentication |
| **SES** | Email (OTP delivery) |

---

## 6. Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Initialize Expo project with folder structure
2. Set up AWS infrastructure (CDK/Terraform)
3. Create database schema and migrations
4. Implement auth flow (register, OTP, login)

### Phase 2: Core Features (Week 3-5)
1. Tab 1: Hype Feed (posts, hypes, comments)
2. Tab 2: Lost & Found + Q&A
3. Tab 3: Daily Quest with real-time chat
4. User profiles and onboarding

### Phase 3: Gamification (Week 6-7)
1. Points system and transactions
2. Leaderboards (boys, girls, general with normalization)
3. Seasons and tier progression

### Phase 4: AI Features (Week 8)
1. Vector embeddings for profiles
2. AI-powered peer matching
3. Content recommendations

### Phase 5: Admin & Polish (Week 9-10)
1. Admin panel
2. Moderation tools
3. Push notifications
4. Testing and bug fixes

---

## 7. Verification Plan

1. **Unit Tests**: Jest for all utility functions (especially normalization.ts)
2. **Integration Tests**: Test API endpoints with Supertest
3. **E2E Tests**: Detox for critical user flows (auth, posting, quest chat)
4. **Module Isolation Test**: Disable each tab and verify others work
5. **Load Testing**: Verify real-time chat handles 100+ concurrent users
6. **Security Audit**: Validate OTP flow, gender-gated content, admin permissions

---

## Critical Files to Create

- `app/_layout.tsx` - Root layout with providers
- `app/(tabs)/_layout.tsx` - Tab navigator with error boundaries
- `src/modules/*/store/*.ts` - Isolated Zustand stores per module
- `src/modules/leaderboard/utils/normalization.ts` - Z-score algorithm
- `src/services/api/client.ts` - Axios client with auth interceptors
- `src/services/realtime/websocket.ts` - WebSocket for quest chat
- `infrastructure/database/schema.sql` - Complete DB schema
