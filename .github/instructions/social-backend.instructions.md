---
description: "Use when: implementing or updating Tab-1 social backend code under backend/tab1-social to enforce response envelopes, SQL transaction safety, and Lambda route conventions."
applyTo: "backend/tab1-social/**/*.{js,sql,md}"
---

# Tab-1 Social Backend Conventions

## API Envelope

- Success responses must always use `{ data: ... }`.
- Error responses must always use `{ error: { code, message } }`.

## Route and Handler Rules

- Keep route dispatch centralized in `src/handler.js`.
- Domain logic and SQL must live in `src/lib/socialRepository.js`.
- Validate IDs, body fields, and query params before repository calls.

## Database Safety

- Use `withTransaction` for mutation flows.
- Never interpolate SQL strings directly; always use parameterized queries.
- Keep hashtag normalization server-side using shared hashtag helpers.

## Auth Rules

- Prefer Cognito JWT claims (`sub`, `name`/`custom:display_name`, `custom:branch`).
- Allow dev headers only when `ENABLE_DEV_HEADERS=true`.
- Keep dev-header support temporary; disable in production.

## Media Upload Rules

- All media upload URLs must be pre-signed via S3.
- Return both `uploadUrl` and CDN-ready `publicUrl`.
- Restrict mediaType to `image` and `video`.

## Environment Variable Rules

- Frontend public API settings must be kept in root `.env` using `EXPO_PUBLIC_*` keys.
- Backend local settings must be kept in `backend/tab1-social/.env`, with defaults mirrored in `backend/tab1-social/.env.example`.
- If new env variables are introduced, update all of these together:
	- `backend/tab1-social/.env.example`
	- `backend/tab1-social/README.md`
	- `backend/tab1-social/docs/aws-console-setup.md`
- Never commit real credentials or secrets in tracked files.

## AWS Setup and Permissions Rules

- Never run application infrastructure day-to-day from AWS root user.
- Require MFA for root and IAM admin identities.
- Place Aurora in private DB subnets and allow DB ingress only from Lambda security group.
- Place Lambda in private app subnets with least-privilege egress.
- NAT is optional for this backend; NAT-free is preferred unless runtime public internet calls are required.
- In NAT-free mode, use VPC endpoints for required AWS APIs instead of opening broad internet egress.
- Use dedicated Lambda execution roles; avoid wildcard IAM permissions where possible.
- Scope S3 permissions to social media key prefixes (for example `social/*`) instead of whole-bucket `*` access.
- Prefer Secrets Manager/Parameter Store over plaintext credentials in Lambda environment.

## Documentation Updates

- Update `project_docs/architecture.md`, `project_docs/file_index.md`, and `project_docs/active_context.md` whenever endpoint contracts, schema, or deployment flow changes.
