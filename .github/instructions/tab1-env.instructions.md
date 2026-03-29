---
description: "Use when: creating or updating environment files for Tab-1 frontend/backend (`.env`, `.env.example`) to keep variable placement and naming consistent."
applyTo: "**/.env*"
---

# Tab-1 Environment File Placement

## File Ownership

- Root `.env` is for Expo frontend runtime values only.
- `backend/tab1-social/.env` is for local backend scripts and local Lambda testing.
- `backend/tab1-social/.env.example` is the tracked template for backend variables.

## Frontend Keys (root `.env`)

- `EXPO_PUBLIC_SOCIAL_API_BASE_URL`
- `EXPO_PUBLIC_DEV_USER_ID`
- `EXPO_PUBLIC_DEV_USER_NAME`
- `EXPO_PUBLIC_DEV_USER_BRANCH`

## Backend Keys (`backend/tab1-social/.env`)

- `DATABASE_URL`
- `PG_SSL`
- `AWS_REGION`
- `SOCIAL_MEDIA_BUCKET`
- `SOCIAL_MEDIA_PUBLIC_BASE_URL`
- `CORS_ALLOW_ORIGIN`
- `DEFAULT_FEED_LIMIT`
- `MAX_FEED_LIMIT`
- `ENABLE_DEV_HEADERS`

## Safety

- Never commit real secrets.
- Keep placeholders/examples in tracked files and real values only in ignored `.env` files.
