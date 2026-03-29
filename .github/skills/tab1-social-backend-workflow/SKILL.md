---
name: tab1-social-backend-workflow
description: "Use when: adding or modifying Tab-1 social backend endpoints (posts, hypes, comments, hashtags, media upload-url) with Lambda + Aurora + S3 in this repo."
---

# Tab-1 Social Backend Workflow

## Goal

Implement backend changes without breaking frontend contracts or memory-bank documentation.

## Required Steps

1. Confirm current contracts
- Read `src/modules/hype/types.ts` and `src/modules/hype/api/hypeApi.ts`.
- Identify payload shape and return envelope requirements.

2. Update backend route layer
- Edit `backend/tab1-social/src/handler.js`.
- Add/modify route parsing and request validation.

3. Update repository/data layer
- Edit `backend/tab1-social/src/lib/socialRepository.js`.
- Keep all SQL parameterized and transaction-safe.

4. Update schema/migration when needed
- Add or modify SQL in `backend/tab1-social/sql/*.sql`.
- Keep indexes aligned with feed query patterns.

5. Update frontend adapter if contract changes
- Edit `src/modules/hype/api/hypeApi.ts`.
- Adjust `src/modules/hype/store/hypeStore.ts` if mutation response shape changes.

6. Validate
- Run backend install if dependencies changed:
  - `cd backend/tab1-social && npm install`
- Run workspace checks:
  - `npm run typecheck`
  - `npm run lint`

7. Update memory bank docs
- `project_docs/architecture.md`
- `project_docs/file_index.md`
- `project_docs/active_context.md`

## Output Checklist

- New/changed route works with existing `{ data: ... }` envelope.
- SQL migration and repository logic stay consistent.
- Frontend Tab-1 still renders and mutations behave correctly.
- AWS setup docs mention any new env vars/permissions.
