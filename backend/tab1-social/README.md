# Tab-1 Social Backend (Hype Feed)

Production backend for NITR HUB Tab-1 using AWS Lambda + API Gateway + Aurora PostgreSQL + S3 pre-signed uploads.

## What This Backend Implements

- Feed listing with cursor pagination and optional hashtag filter
- Post creation with hashtag extraction and media attachment metadata
- Hype toggle (like/unlike)
- Comment creation
- Trending hashtag aggregation
- S3 pre-signed upload URL generation for image/video media
- Cognito-authorizer support (plus optional dev headers fallback)

## Folder Structure

```text
backend/tab1-social/
|- src/
|  |- handler.js                 # Lambda entrypoint and route dispatch
|  '- lib/
|     |- auth.js                 # Cognito claims / dev-header user extraction
|     |- db.js                   # Postgres pool + transaction helper
|     |- errors.js               # Typed HTTP errors
|     |- hashtags.js             # hashtag parsing and normalization
|     |- http.js                 # API Gateway response helpers
|     |- media.js                # S3 pre-signed URL helper
|     '- socialRepository.js     # SQL queries and domain logic
|- sql/
|  '- 001_tab1_social.sql        # Tab-1 schema migration
|- scripts/
|  '- runMigration.js            # Migration runner
'- docs/
   '- aws-console-setup.md       # End-to-end AWS setup steps
```

## API Routes

Base path: `/api/v1/social`

1. `GET /health`
2. `GET /posts?limit=20&cursor=...&hashtag=#fest`
3. `GET /posts/{postId}`
4. `POST /posts`
5. `POST /posts/{postId}/hypes`
6. `POST /posts/{postId}/comments`
7. `GET /hashtags/trending?limit=10`
8. `POST /media/upload-url`

Response envelope:

```json
{
  "data": {}
}
```

Error envelope:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable error"
  }
}
```

## Environment Variables

Create Lambda environment variables from `.env.example`:

- `DATABASE_URL`: Aurora PostgreSQL connection string
- `PG_SSL`: `true` for Aurora in VPC
- `AWS_REGION`: e.g. `ap-south-1`
- `SOCIAL_MEDIA_BUCKET`: S3 bucket name for tab-1 media
- `SOCIAL_MEDIA_PUBLIC_BASE_URL`: CloudFront URL (recommended)
- `CORS_ALLOW_ORIGIN`: allowed app origin (`*` for development)
- `DEFAULT_FEED_LIMIT`: default pagination size
- `MAX_FEED_LIMIT`: hard page-size cap
- `ENABLE_DEV_HEADERS`: `true` only while auth is not yet wired in app

## Local Setup

1. Install dependencies

```bash
cd backend/tab1-social
npm install
```

2. Create local backend env file

```bash
cp .env.example .env
```

Then fill all values in `.env`.

3. Run migration

```bash
npm run migrate
```

4. Deploy Lambda code (zip + upload) and connect to API Gateway routes.

Detailed steps: [docs/aws-console-setup.md](docs/aws-console-setup.md)

## Frontend Wiring

Create root `.env` and set these Expo vars (used in `src/modules/hype/api/hypeApi.ts`):

- `EXPO_PUBLIC_SOCIAL_API_BASE_URL`
- `EXPO_PUBLIC_DEV_USER_ID` (optional dev only)
- `EXPO_PUBLIC_DEV_USER_NAME` (optional dev only)
- `EXPO_PUBLIC_DEV_USER_BRANCH` (optional dev only)

If `EXPO_PUBLIC_SOCIAL_API_BASE_URL` is not set, frontend falls back to the previous in-memory mock adapter for local UI iteration.
