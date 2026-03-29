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

2. `GET /api/v1/social/posts/{postId}`
- Returns one feed item in `data`.

3. `POST /api/v1/social/posts`
- Body:

```json
{
  "caption": "string",
  "media": [
    { "uri": "https://...", "mediaType": "image" }
  ]
}
```

4. `POST /api/v1/social/posts/{postId}/hypes`
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

5. `POST /api/v1/social/posts/{postId}/comments`
- Body:

```json
{ "body": "string" }
```

6. `GET /api/v1/social/hashtags/trending`
- Query: `limit` (1-20)
- Returns:

```json
{
  "data": [
    { "tag": "#nitr", "count": 20 }
  ]
}
```

7. `POST /api/v1/social/media/upload-url`
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
