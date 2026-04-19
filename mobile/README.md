# Semantic Bookmarks - React Native Mobile App

React Native (Expo) mobile app for the Semantic Bookmarks platform. Uses the same FastAPI backend as the web app.

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- For Android: Android Studio with an emulator or a physical device with [Expo Go](https://expo.dev/client)
- For iOS: Xcode (macOS only) or Expo Go on a physical device
- Backend server running (see `../backend/`)

## Quick Start

```bash
cd mobile

# Install dependencies
npm install

# Start the Expo dev server
npx expo start
```

Then:
- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator
- Scan the QR code with Expo Go on your physical device

## Environment Setup

Create a `.env` file in the `mobile/` directory:

```env
EXPO_PUBLIC_API_URL=http://localhost:6005/api/v1
```

For physical device testing, use your machine's local IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:6005/api/v1
```

## Google Sign-In Setup

The app uses Google OAuth via the same backend endpoint as the Chrome extension (`/auth/google/extension`).

### Steps:

1. Install the Google Sign-In library:
   ```bash
   npx expo install @react-native-google-signin/google-signin
   ```

2. Add to `app.json` plugins:
   ```json
   {
     "plugins": [
       "@react-native-google-signin/google-signin"
     ]
   }
   ```

3. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create an **Android** OAuth client ID
     - Package name: `com.semanticbookmarks.app`
     - SHA-1 fingerprint: Get from `./android/app/debug.keystore` or your signing key
   - Create an **iOS** OAuth client ID (if targeting iOS)
     - Bundle ID: `com.semanticbookmarks.app`

4. Configure in `src/screens/auth/SignInScreen.tsx`:
   ```typescript
   import { GoogleSignin } from '@react-native-google-signin/google-signin';

   GoogleSignin.configure({
     webClientId: 'YOUR_WEB_CLIENT_ID',
     offlineAccess: true,
   });

   const handleGoogleSignIn = async () => {
     const userInfo = await GoogleSignin.signIn();
     const { accessToken } = await GoogleSignin.getTokens();
     await signIn(accessToken); // This calls /auth/google/extension
   };
   ```

5. Build a development client (Google Sign-In doesn't work in Expo Go):
   ```bash
   npx expo prebuild
   npx expo run:android   # or run:ios
   ```

## Project Structure

```
mobile/
├── App.tsx                              # Entry point with providers
├── app.json                             # Expo configuration
├── src/
│   ├── types/
│   │   ├── api.ts                       # API type definitions (shared with web)
│   │   └── navigation.ts               # Navigation param types
│   ├── lib/
│   │   ├── api-client.ts               # Axios instance with JWT interceptor
│   │   ├── auth.ts                      # Google auth + backend token exchange
│   │   ├── storage.ts                   # SecureStore (JWT) + AsyncStorage (cache)
│   │   └── utils.ts                     # Utilities (date formatting, etc.)
│   ├── hooks/
│   │   ├── useBookmarkApi.ts            # Bookmark CRUD, search, tags, categories
│   │   ├── useFeedApi.ts               # Explore feed + friends feed
│   │   ├── useFollowApi.ts             # Follow/unfollow, requests, user search
│   │   ├── usePreferencesApi.ts        # User interests + discoverability
│   │   └── useNetworkStatus.ts         # Offline detection
│   ├── theme/
│   │   ├── colors.ts                    # Light/dark color palettes
│   │   └── ThemeContext.tsx             # Theme provider + useTheme hook
│   ├── contexts/
│   │   └── AuthContext.tsx              # Auth state, signIn/signOut
│   ├── navigation/
│   │   ├── RootNavigator.tsx            # Auth gate (SignIn or Tabs)
│   │   └── TabNavigator.tsx             # 5-tab bottom navigation
│   ├── screens/
│   │   ├── auth/SignInScreen.tsx         # Google OAuth sign-in
│   │   ├── feed/FeedScreen.tsx          # Friends' bookmarks feed
│   │   ├── explore/ExploreScreen.tsx    # AI article recommendations
│   │   ├── bookmarks/BookmarksScreen.tsx # Bookmark management + search
│   │   ├── social/SocialScreen.tsx      # Following, followers, requests
│   │   └── profile/ProfileScreen.tsx    # User settings, interests, sign out
│   └── components/
│       ├── ArticleCard.tsx              # Unified card (bookmark/feed/friend)
│       ├── AddBookmarkSheet.tsx         # Bottom sheet: URL → preview → save
│       ├── UserSearchSheet.tsx          # Bottom sheet: search + follow users
│       ├── OnboardingSheet.tsx          # Topic selection for new users
│       ├── TopicSelector.tsx            # Topic pill grid
│       ├── UserCard.tsx                 # User row with avatar
│       ├── FollowButton.tsx             # Follow/Pending/Unfollow states
│       ├── FollowRequestCard.tsx        # Accept/reject follow request
│       ├── EmptyState.tsx               # Reusable empty state
│       └── OfflineBanner.tsx            # Offline network banner
```

## Features

All features from the web app are supported:

- **Semantic Search** - Natural language bookmark search powered by vector similarity
- **Add Bookmarks** - Paste URL → auto-scrape → AI tags + category → save
- **Organize** - Filter by category, tags, read/unread status
- **Explore** - Personalized AI article recommendations based on your interests
- **Friends Feed** - See bookmarks from people you follow
- **Social** - Follow/unfollow users, manage follow requests
- **Profile** - Edit interests, toggle discoverability, sign out
- **Dark Mode** - Follows system theme automatically
- **Offline Detection** - Shows banner when offline, disables write actions

## Architecture

```
React Native (Expo)
    ↓ Google Sign-In → access_token
Backend (/auth/google/extension)
    ↓ Returns JWT
React Native stores JWT in SecureStore
    ↓ All API calls use JWT Bearer token
Backend (FastAPI) → PostgreSQL + pgvector
```

The mobile app uses the exact same backend endpoints as the web app. Authentication uses the `/auth/google/extension` endpoint (originally built for the Chrome extension), which accepts a Google access token and returns a JWT.

## Building for Production

### Android APK/AAB

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure (first time only)
eas build:configure

# Build APK for testing
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

### iOS (macOS only)

```bash
eas build --platform ios --profile production
```

### Play Store Submission

1. Create a [Google Play Developer account](https://play.google.com/console/) ($25 one-time fee)
2. Create a new app listing
3. Upload the AAB from `eas build`
4. Fill in:
   - App description and screenshots
   - Privacy policy URL (required)
   - Data safety section (declare: email, name, bookmarks data)
   - Content rating questionnaire
5. Submit for review (1-7 days)

## Development Notes

- **No NativeWind** - Uses plain `StyleSheet.create` with theme colors for simplicity
- **Bottom sheets** instead of web dialogs - more native feel on mobile
- **ActionSheet** for item actions - replaces web hover menus and 3-dot dropdowns
- **FlatList** for infinite scroll - replaces web's IntersectionObserver pattern
- The API hooks mirror the web's `frontend/lib/auth-api.ts` but use the shared Axios instance directly instead of NextAuth's `makeRequest` pattern
