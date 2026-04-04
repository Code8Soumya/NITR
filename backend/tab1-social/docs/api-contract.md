# Tab-1 Social API Contract

## Envelope

Success:

```json
{ "data": {} }
```

Failure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Explanation"
  }
}
```

## Feed Item Shape

```json
{
  "id": "uuid",
  "userId": "string",
  "authorName": "string",
  "authorBranch": "string",
  "authorBio": "string (optional)",
  "caption": "string",
  "hashtags": ["#tag"],
  "createdAt": "2026-03-29T09:00:00.000Z",
  "hypeCount": 12,
  "isHypedByMe": false,
  "media": [
    {
      "id": "uuid",
      "uri": "https://...",
      "mediaType": "image"
    }
  ],
  "comments": [
    {
      "id": "uuid",
      "postId": "uuid",
      "userId": "string",
      "displayName": "string",
      "body": "string",
      "createdAt": "2026-03-29T09:00:00.000Z"
    }
  ]
}
```

## Endpoints

1. `GET /api/v1/social/posts`
- Query: `limit` (1-50), `cursor`, `hashtag`
- Returns:

```json
{
  "data": {
    "items": [],
    "nextCursor": "optional-base64-cursor"
  }
}
```

2. `GET /api/v1/social/users/{userId}/posts`
- Query: `limit` (1-50), `cursor`
- Returns:

```json
{
  "data": {
    "items": [],
    "nextCursor": "optional-base64-cursor"
  }
}
```

3. `GET /api/v1/social/posts/{postId}`
- Returns one feed item in `data`.

4. `DELETE /api/v1/social/posts/{postId}`
- Returns:

```json
{
  "data": {
    "success": true
  }
}
```

*Compatibility note:* if an API Gateway deployment has not wired the DELETE route yet, clients can call `POST /api/v1/social/posts` with `{ "action": "delete", "postId": "uuid" }`.

5. `POST /api/v1/social/posts`
- Body:

```json
{
  "caption": "string",
  "media": [
    { "uri": "https://...", "mediaType": "image" }
  ]
}
```
*Validation notes:*
- `media` array is mandatory and must contain at least one item.
- Caption supports at most 5 unique hashtags; otherwise API returns `HASHTAG_LIMIT_EXCEEDED`.
- Frontend upload policy supports media ratios `9:16`, `16:9`, `3:4`, `4:3`, `1:1`, `4:5`.

6. `POST /api/v1/social/posts/{postId}/hypes`
- Body: none
- Returns:

```json
{
  "data": {
    "postId": "uuid",
    "hypeCount": 13,
    "isHypedByMe": true
  }
}
```

7. `POST /api/v1/social/posts/{postId}/comments`
- Body:

```json
{ "body": "string" }
```

*Note: each user can keep only one comment per post; posting again updates the previous comment.*

8. `GET /api/v1/social/hashtags/trending`
- Query: `limit` (1-20)
- Returns:

```json
{
  "data": [
    { "tag": "#nitr", "count": 20 }
  ]
}
```

9. `POST /api/v1/social/media/upload-url`
- Body:

```json
{
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg",
  "mediaType": "image"
}
```

- Returns:

```json
{
  "data": {
    "key": "social/user/date/file",
    "uploadUrl": "https://signed-url",
    "publicUrl": "https://cdn-url",
    "expiresIn": 900
  }
}
```

## Auth Endpoints

10. `POST /api/v1/auth/register`
- Body:

```json
{
  "email": "122ME0914@nitrkl.ac.in",
  "password": "Str0ngPass123",
  "name": "Admin Name",
  "nickname": "nitr_admin",
  "birthDate": "2004-01-10",
  "gender": "male",
  "branch": "ME",
  "bio": "Mechanical student.",
  "interests": ["CAD", "Cricket"]
}
```

- Returns when `COGNITO_OTP_ENABLED=true`:

```json
{
  "data": {
    "otpRequired": true,
    "email": "122me0914@nitrkl.ac.in",
    "delivery": {
      "destination": "1***@nitrkl.ac.in",
      "medium": "EMAIL",
      "attributeName": "email"
    },
    "message": "OTP sent. Verify your email before login."
  }
}
```

- Returns when `COGNITO_OTP_ENABLED=false`:

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "122me0914@nitrkl.ac.in",
      "name": "Admin Name",
      "nickname": "nitr_admin",
      "branch": "ME",
      "birthDate": "2004-01-10",
      "gender": "male",
      "bio": "Mechanical student.",
      "interests": ["CAD", "Cricket"],
      "approvalStatus": "approved",
      "isAdmin": true,
      "approvedAt": "2026-03-30T10:00:00.000Z",
      "rejectedAt": null,
      "rejectionReason": null,
      "createdAt": "2026-03-30T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt",
      "refreshToken": "jwt"
    }
  }
}
```

11. `POST /api/v1/auth/verify-otp`
- Body:

```json
{
  "email": "student@nitrkl.ac.in",
  "code": "123456"
}
```

- Returns:

```json
{
  "data": {
    "verified": true,
    "user": {
      "id": "uuid",
      "email": "student@nitrkl.ac.in",
      "emailVerified": true,
      "otpVerifiedAt": "2026-03-30T11:00:00.000Z"
    }
  }
}
```

12. `POST /api/v1/auth/resend-otp`
- Body:

```json
{
  "email": "student@nitrkl.ac.in"
}
```

- Returns:

```json
{
  "data": {
    "sent": true,
    "email": "student@nitrkl.ac.in",
    "delivery": {
      "destination": "s***@nitrkl.ac.in",
      "medium": "EMAIL",
      "attributeName": "email"
    }
  }
}
```

13. `POST /api/v1/auth/login`
- Body:

```json
{
  "email": "student@nitrkl.ac.in",
  "password": "Str0ngPass123"
}
```

- Returns: same envelope as register.

14. `POST /api/v1/auth/refresh`
- Body:

```json
{
  "refreshToken": "jwt"
}
```

- Returns: same envelope as register with rotated tokens.

15. `PUT /api/v1/auth/profile`
- Header: `Authorization: Bearer <accessToken>`
- Body (any subset):

```json
{
  "name": "Updated full name",
  "nickname": "updated_nick",
  "branch": "ECE",
  "bio": "Updated bio",
  "interests": ["music", "photography", "coding"]
}
```

- Immutable fields: `email`, `birthDate`, and `gender` cannot be changed after registration.
- Returns `data` with updated user profile.

16. `GET /api/v1/auth/me`
- Header: `Authorization: Bearer <accessToken>`
- Returns `data` with user profile.

17. `POST /api/v1/auth/logout`
- Header: `Authorization: Bearer <accessToken>`
- Body:

```json
{
  "refreshToken": "jwt"
}
```

- Returns:

```json
{
  "data": {
    "success": true
  }
}
```

## Admin Approval Endpoints

18. `GET /api/v1/admin/approvals/pending`
- Header: `Authorization: Bearer <adminAccessToken>`
- Returns `data` as list of pending users.

19. `POST /api/v1/admin/approvals/{userId}/approve`
- Header: `Authorization: Bearer <adminAccessToken>`
- Returns `data` with updated approved user.

20. `POST /api/v1/admin/approvals/{userId}/reject`
- Header: `Authorization: Bearer <adminAccessToken>`
- Body:

```json
{
  "reason": "Invalid student details"
}
```

- Returns `data` with updated rejected user.
