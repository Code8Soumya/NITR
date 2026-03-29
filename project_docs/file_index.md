# File Index

**Last Updated**: 2026-03-29

This document maps the project directory structure and describes key files. Update this file whenever you create, delete, or significantly modify files.

## Current Project Status

[DONE] Expo project scaffolded, [DONE] Tab-1 frontend implemented, and [DONE] Tab-1 Lambda backend scaffolded with Aurora + S3 integration.

## Directory Structure

```text
NITR/
|- app/
|  |- _layout.tsx                      # Root layout: SafeArea + GestureHandler + stack
|  |- index.tsx                        # Redirect to /(tabs)/hype
|  '- (tabs)/
|     |- _layout.tsx                   # 3-tab navigator
|     |- hype/
|     |  |- index.tsx                  # Tab-1 feed route (with error boundary)
|     |  |- create.tsx                 # Tab-1 create post route
|     |  '- [postId].tsx               # Tab-1 post detail route
|     |- campus/
|     |  '- index.tsx                  # Tab-2 placeholder screen
|     '- quest/
|        '- index.tsx                  # Tab-3 placeholder screen
|- src/
|  |- modules/
|  |  '- hype/                         # Tab-1 isolated module
|  |     |- api/
|  |     |  '- hypeApi.ts              # HTTP API adapter for /api/v1/social with local mock fallback + dev header support
|  |     |- components/
|  |     |  |- CommentBubble.tsx       # Comment row UI
|  |     |  |- HashtagRail.tsx         # Trending hashtag filter UI
|  |     |  '- PostCard.tsx            # Reusable post card UI
|  |     |- constants/
|  |     |  '- mockFeed.ts             # Seed feed data
|  |     |- hooks/
|  |     |  |- useHypeActions.ts       # Action hooks over Zustand store
|  |     |  '- useHypeFeed.ts          # Feed selectors/loading logic
|  |     |- screens/
|  |     |  |- CreatePostScreen.tsx    # Create post screen
|  |     |  |- HypeFeedScreen.tsx      # Feed list screen
|  |     |  '- PostDetailScreen.tsx    # Post + comments screen
|  |     |- store/
|  |     |  '- hypeStore.ts            # Zustand isolated state/actions
|  |     '- types.ts                   # Tab-1 domain types
|  '- shared/
|     '- components/
|        '- ModuleErrorBoundary.tsx    # Per-module crash isolation boundary
|- backend/
|  '- tab1-social/                     # Tab-1 backend package (Lambda + Aurora + S3)
|     |- src/
|     |  |- handler.js                 # Lambda entrypoint; routes all /api/v1/social requests
|     |  '- lib/
|     |     |- auth.js                 # Resolves current user from Cognito JWT claims or dev headers
|     |     |- db.js                   # PostgreSQL pool and transaction helper (`withTransaction` export)
|     |     |- errors.js               # `HttpError` abstraction for consistent API errors
|     |     |- hashtags.js             # Caption hashtag extraction + normalization utilities
|     |     |- http.js                 # API Gateway response helpers + JSON parsing utilities
|     |     |- media.js                # S3 pre-signed upload URL creation (`createMediaUploadUrl` export)
|     |     '- socialRepository.js     # SQL data access layer for feed, posts, hypes, comments, and trends
|     |- sql/
|     |  '- 001_tab1_social.sql        # Migration: social schema tables, indexes, triggers
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
|- package.json                        # Dependencies and scripts
|- .env                                # Root Expo environment file (`EXPO_PUBLIC_*`, gitignored)
'- index.js                            # expo-router entry
```

## Notes

- Tab-1 backend package is now present under `backend/tab1-social/` and can be deployed as a single Lambda integration behind HTTP API Gateway routes.
- Frontend Tab-1 API client supports production HTTP mode plus explicit fallback mock mode when API base URL is not configured.
- Root `.env` stores Expo public runtime values for frontend API wiring.
- `backend/tab1-social/.env` stores local backend values and is consumed by `npm run migrate`.
- Import alias `@/` is enabled via `babel-plugin-module-resolver`.
- Lint setup uses ESLint v8 with legacy `.eslintrc.js` for Expo compatibility.
- Project dependency baseline is now Expo SDK 54.
