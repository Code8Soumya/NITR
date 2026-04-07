# Deep Logic Bridges Map

> **Auto-generated file** - Do not edit manually. Generated on: 2026-04-07T17:16:50.181Z

## 📱 Frontend Routes (Expo Router)
| Route Path | Component Name | File |
|---|---|---|
| `(admin)/approvals` | AdminApprovalsRoute | `(admin)/approvals.tsx` |
| `(admin)/_layout` | AdminLayout | `(admin)/_layout.tsx` |
| `(auth)/login` | LoginRoute | `(auth)/login.tsx` |
| `(auth)/pending` | PendingRoute | `(auth)/pending.tsx` |
| `(auth)/register` | RegisterRoute | `(auth)/register.tsx` |
| `(auth)/verify-otp` | VerifyOtpRoute | `(auth)/verify-otp.tsx` |
| `(auth)/_layout` | AuthLayout | `(auth)/_layout.tsx` |
| `(tabs)/campus` | CampusPlaceholderScreen | `(tabs)/campus/index.tsx` |
| `(tabs)/hype/create` | CreateHypeRoute | `(tabs)/hype/create.tsx` |
| `(tabs)/hype/edit-profile` | EditProfileRoute | `(tabs)/hype/edit-profile.tsx` |
| `(tabs)/hype` | HypeRoute | `(tabs)/hype/index.tsx` |
| `(tabs)/hype/profile` | ProfileRoute | `(tabs)/hype/profile.tsx` |
| `(tabs)/hype/[postId]` | PostDetailRoute | `(tabs)/hype/[postId].tsx` |
| `(tabs)/quest` | QuestPlaceholderScreen | `(tabs)/quest/index.tsx` |
| `(tabs)/_layout` | TabsLayout | `(tabs)/_layout.tsx` |
| `index` | Index | `index.tsx` |
| `_layout` | RootLayout | `_layout.tsx` |

## 🔄 State Management (Zustand)
### Module: auth
- **File**: `src/modules/auth/store/authStore.ts`
- **Actions**: `initialize`, `login`, `register`, `updateProfile`, `refreshProfile`, `logout`, `clearError`

### Module: hype
- **File**: `src/modules/hype/store/hypeStore.ts`
- **Actions**: `loadFeed`, `loadUserPosts`, `refreshFeed`, `cycleVideoAudioMode`, `setActiveHashtag`, `createPost`, `toggleHype`, `addComment`, `deletePost`

## 🌐 API Integrations
| Module | Function | HTTP Method | Endpoint | File |
|---|---|---|---|---|
| auth | `register` | `POST` | `/api/v1/auth/register` | `src/modules/auth/api/authApi.ts` |
| auth | `login` | `POST` | `/api/v1/auth/login` | `src/modules/auth/api/authApi.ts` |
| auth | `verifyOtp` | `POST` | `/api/v1/auth/verify-otp` | `src/modules/auth/api/authApi.ts` |
| auth | `resendOtp` | `POST` | `/api/v1/auth/resend-otp` | `src/modules/auth/api/authApi.ts` |
| auth | `refresh` | `POST` | `/api/v1/auth/refresh` | `src/modules/auth/api/authApi.ts` |
| auth | `me` | `PUT` | `/api/v1/auth/me` | `src/modules/auth/api/authApi.ts` |
| auth | `logout` | `POST` | `/api/v1/auth/logout` | `src/modules/auth/api/authApi.ts` |
| auth | `getPendingApprovals` | `POST` | `/api/v1/admin/approvals/pending` | `src/modules/auth/api/authApi.ts` |
| auth | `rejectUser` | `POST` | `/api/v1/admin/approvals/${encodeURIComponent(userId)}/reject` | `src/modules/auth/api/authApi.ts` |
| hype | `getFeed` | `DELETE` | `/api/v1/social/posts${suffix}` | `src/modules/hype/api/hypeApi.ts` |
| hype | `deletePost` | `POST` | `/api/v1/social/posts` | `src/modules/hype/api/hypeApi.ts` |
| hype | `createPost` | `POST` | `/api/v1/social/media/upload-url` | `src/modules/hype/api/hypeApi.ts` |
| hype | `createPost` | `POST` | `/api/v1/social/posts` | `src/modules/hype/api/hypeApi.ts` |
| hype | `toggleHype` | `POST` | `/api/v1/social/posts/${encodeURIComponent(postId)}/hypes` | `src/modules/hype/api/hypeApi.ts` |
| hype | `addComment` | `POST` | `/api/v1/social/posts/${encodeURIComponent(payload.postId)}/comments` | `src/modules/hype/api/hypeApi.ts` |

## ⚡ Backend Lambda Routes
| Backend Module | HTTP Method | Route Match | Type | File |
|---|---|---|---|---|
| tab1-social | `GET` | `/api/v1/social/health` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `POST` | `/api/v1/auth/register` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `POST` | `/api/v1/auth/login` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `POST` | `/api/v1/auth/verify-otp` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `POST` | `/api/v1/auth/resend-otp` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `POST` | `/api/v1/auth/refresh` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `POST` | `/api/v1/auth/logout` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `GET` | `/api/v1/auth/me` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `PUT` | `/api/v1/auth/profile` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `GET` | `/api/v1/admin/approvals/pending` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `GET` | `/api/v1/social/posts` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `POST` | `/api/v1/social/posts` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `GET` | `/api/v1/social/hashtags/trending` | exact | `backend/tab1-social/src/handler.js` |
| tab1-social | `POST` | `/api/v1/social/media/upload-url` | exact | `backend/tab1-social/src/handler.js` |

## 🗄️ Database Repositories
### tab1-social - `backend/tab1-social/src/lib/authRepository.js`
- **`import`** -> Tables Accessed: `profile`, `auth.refresh_sessions`, `auth.users`
- **`registerUser`** -> Tables Accessed: `auth.users`
- **`loginUser`** -> Tables Accessed: `auth.users`
- **`getUserById`** -> Tables Accessed: `auth.users`
- **`refreshTokens`** -> Tables Accessed: `auth.refresh_sessions`, `auth.users`
- **`revokeRefreshSession`** -> Tables Accessed: `auth.refresh_sessions`
- **`listPendingApprovals`** -> Tables Accessed: `auth.users`
- **`approveUser`** -> Tables Accessed: `auth.users`
- **`rejectUser`** -> Tables Accessed: `auth.users`
- **`verifyUserOtp`** -> Tables Accessed: `auth.users`
- **`resendUserOtp`** -> Tables Accessed: _None or dynamic_
- **`updateUserProfile`** -> Tables Accessed: `auth.users`

### tab1-social - `backend/tab1-social/src/lib/socialRepository.js`
- **`import`** -> Tables Accessed: `social.posts`, `social.post_media`, `social.post_hashtags`, `social.hashtags`, `social.comments`, `auth.users`, `social.post_hypes`, `SET`
- **`listFeed`** -> Tables Accessed: `social.posts`, `auth.users`, `social.post_hypes`, `social.follows`, `social.post_hashtags`, `social.hashtags`
- **`listUserPosts`** -> Tables Accessed: `social.posts`, `auth.users`, `social.post_hypes`, `social.follows`
- **`getPostById`** -> Tables Accessed: _None or dynamic_
- **`deletePost`** -> Tables Accessed: `social.posts`
- **`createPost`** -> Tables Accessed: `social.posts`, `social.post_media`
- **`toggleHype`** -> Tables Accessed: `social.post_hypes`
- **`addComment`** -> Tables Accessed: `social.comments`
- **`getTrendingHashtags`** -> Tables Accessed: `social.post_hashtags`, `social.hashtags`, `social.posts`

