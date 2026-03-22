# File Index

**Last Updated**: 2026-03-22

This document maps the project directory structure and describes key files. Update this file whenever you create, delete, or significantly modify files.

## Current Project Status

⚠️ **Project is in initial setup phase** - Most files are not yet created.

## Directory Structure

```
nitr-hub/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Login, register, verify-otp
│   ├── (onboarding)/             # Profile setup
│   ├── (tabs)/                   # Main 3-tab navigator
│   │   ├── hype/                 # Tab 1: Social feed
│   │   ├── campus/               # Tab 2: Lost & Found + Q&A
│   │   └── quest/                # Tab 3: Daily chat
│   ├── (leaderboard)/            # Leaderboard screens
│   └── (admin)/                  # Admin screens
├── src/
│   ├── modules/                  # Feature modules
│   │   ├── auth/                 # Authentication module
│   │   │   ├── api/              # API calls
│   │   │   ├── hooks/            # React hooks
│   │   │   ├── store/            # Zustand store
│   │   │   └── components/       # UI components
│   │   ├── hype/                 # Social feed module
│   │   ├── campus/               # Lost & Found + Q&A module
│   │   ├── quest/                # Daily quest chat module
│   │   ├── leaderboard/          # Gamification module
│   │   │   └── utils/
│   │   │       └── normalization.ts  # Z-score leaderboard normalization
│   │   └── matching/             # AI peer matching module
│   ├── shared/                   # Shared UI components, hooks, utils
│   ├── services/                 # API client, WebSocket, token management
│   └── providers/                # React context providers
├── project_docs/                 # Memory Bank (this folder)
│   ├── architecture.md           # Tech stack, database, navigation
│   ├── file_index.md             # This file
│   └── active_context.md         # Current work tracking
├── CLAUDE.md                     # Claude Code instructions
└── package.json                  # Dependencies (to be created)
```

## Key Files Not Yet Created

The following files are planned but not yet implemented:

### Configuration
- `package.json` - Project dependencies
- `app.json` / `app.config.js` - Expo configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - NativeWind/Tailwind configuration
- `.env` - Environment variables

### Core Setup
- `src/services/api.ts` - Base API client setup
- `src/services/websocket.ts` - AppSync WebSocket client
- `src/providers/AuthProvider.tsx` - Auth context provider

### Critical Modules
- `src/modules/leaderboard/utils/normalization.ts` - Gender-normalized leaderboard calculation
- Each module's store, API, hooks, and components

## Notes

- When creating new files, add them to this index with a brief description
- When files are deleted, remove them from this index
- Mark files with ⚠️ if they contain critical business logic
- Mark files with 🔒 if they contain security-sensitive code
