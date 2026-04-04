# Database Design

## Overview
This document outlines the database schema architecture for NITR HUB, organized by isolated schemas for different domains. The database utilizes PostgreSQL with advanced features such as UUIDs, TIMESTAMPTZ, ENUM constraints, Array fields, and standard relational constraints tailored for performance and consistency.

## Schemas

### 1. Auth Schema (`auth`)
Handles user authentication, profiles, role management, and session tokens.

#### `auth.users`
The core users table, mapped closely with AWS Cognito (via `cognito_sub`) but contains application-specific fields natively to avoid cross-service latency.
- **id**: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- **cognito_sub**: `text UNIQUE` for syncing with AWS Cognito.
- **email**: `text UNIQUE` (must be a valid `nitrkl.ac.in` domain)
- **Profile Data**: `full_name`, `display_name`, `nickname`, `branch`, `birth_date` (Required/NOT NULL), `gender`, `bio`, `interests` (Array of Text).
- **Admin Checks**: `is_admin`, `approval_status` ('pending', 'approved', 'rejected').
- **Audit Logs**: `created_at`, `updated_at`, `last_login_at`, etc.

#### `auth.refresh_sessions`
Manages active access, mostly mapping refresh tokens.
- **id**: `uuid PRIMARY KEY`
- **user_id**: `uuid REFERENCES auth.users(id)`
- **expires_at**: `timestamptz`

### 2. Social Schema (`social`)
Manages posts, hypes (likes), comments, follows (relationships), media, and the hashtag system.

#### `social.posts`
Stores core post logic and handles privacy via `visibility`.
- **id**: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- **author_id**: `uuid REFERENCES auth.users(id)`
- **caption**: `text` (Max 2000 chars)
- **visibility**: `text CHECK (IN ('public', 'followers', 'connections'))`
    - `public`: Visible to everyone.
    - `followers`: Visible only to users who follow the author.
    - `connections`: Visible only to mutual followers (follower + following).
- **Audit Logs**: `created_at`, `updated_at`, `deleted_at`.
- *Indexes*: `(author_id)`, `(created_at DESC, id DESC) WHERE deleted_at IS NULL`

*API Request Impact*:
- Creating a post inserts a row into this table alongside multiple rows into `social.post_media`.
- Feeds filter `deleted_at IS NULL` and respect the `visibility` flags by performing EXISTS subqueries against `social.follows`.

#### `social.post_media`
Tracks attachments linked to posts (images/videos uploaded to S3).
- **post_id**: `uuid REFERENCES social.posts(id) ON DELETE CASCADE`
- **uri**: `text`
- **media_type**: `text CHECK ('image', 'video')`

#### `social.post_hypes`
Tracks "Likes" on posts.
- **post_id / user_id**: Composite Primary Key. References `posts` and `auth.users`.

*API Request Impact*:
- Toggling a hype triggers an `INSERT INTO ... ON CONFLICT DO NOTHING`, or a `DELETE` if already hyped, keeping atomicity strict.

#### `social.comments`
Stores discussions. Only one comment is allowed per user per post to enforce quality interactions.
- **id**: `uuid PRIMARY KEY`
- **post_id**: `uuid`
- **user_id**: `uuid`
- **body**: `text`
- *Constraints*: `UNIQUE (post_id, user_id)`

#### `social.follows`
Tracks user relationships explicitly.
- **follower_id**: The user initiating the follow.
- **following_id**: The user being followed.
- *Indexes*: `(follower_id, following_id) [PK]`, `(following_id) [Index]`

*API Request Impact*:
- This table acts as a guard on `social.posts` feeds. Post queries join against this to check `public`, `followers`, or `connections` states dynamically.

#### `social.hashtags` & `social.post_hashtags`
Normalizes tag searches across the application. `#tag` formats are rigorously validated.

## Principles used in Redesign
- **Data Consistency**: Direct DB constraints (e.g. `ON DELETE CASCADE`) are employed so application logic isn't exclusively responsible for complex referential integrity.
- **Normalization over Denormalization**: Replaced `author_name` and `author_branch` fields on `social.posts` favoring strict FK queries + PostgreSQL JOIN logic, making author profile changes immediately reflect everywhere.
- **Identity Types**: Using `gen_random_uuid()` per Postgres standards for obfuscated front-end identifiers.
- **Timestamp Strategy**: `TIMESTAMPTZ` is used universally, with Database level Triggers automating `updated_at` timestamps for consistency.

## Usage
Ensure the tables remain decoupled to limit massive cross-domain dependencies unless explicit joins are needed through `auth.users(id)`.
