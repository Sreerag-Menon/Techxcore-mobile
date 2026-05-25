# AAI LMS Mobile

Expo Router based mobile client for the AAI LMS platform, supporting both student and parent experiences on top of the existing JWT-secured backend.

## Stack

- Expo with TypeScript
- Expo Router for file-based navigation
- Redux Toolkit + React Redux for state management
- Axios for API communication
- React Hook Form + Zod for form handling and validation
- NativeWind + theme context for styling
- Expo Secure Store + AsyncStorage for persistence

## Getting Started

1. Install dependencies:

```sh
npm install
```

2. Configure environment variables in `.env`:

```env
API_BASE_URL=http://localhost:8081
API_VERSION=v0.1
```

If your environment requires Expo public variables, mirror them as:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8081
EXPO_PUBLIC_API_VERSION=v0.1
```

3. Start the development server:

```sh
npm run start
```

## Architecture Overview

### App routes

- `app/(auth)` contains login and password reset
- `app/(student)` contains the student dashboard, courses, assessments, profile, and notifications
- `app/(parent)` contains the parent dashboard, performance, messages, profile, and child detail views

### Core folders

- `src/api` contains the Axios client, endpoint constants, and response normalization helpers
- `src/redux` contains the store, typed hooks, and feature slices
- `src/components` contains reusable UI primitives and form wrappers
- `src/layouts` contains common screen, tab, and keyboard-safe wrappers
- `src/services` contains higher-level feature requests used by screens
- `src/theme` contains the app theme tokens and theme provider
- `src/types` contains shared domain types

## Authentication Notes

- Backend auth uses JWT via the `x-access-token` header
- Tokens are stored in Secure Store
- Session metadata is cached locally for route restoration
- All API requests use `POST` payloads, matching the LMS backend behavior

## Current Behavior

- Student and parent route groups are protected and redirect based on `member_type`
- Dashboard, course, assessment, notification, and parent monitoring screens are wired to the API layer
- Profile edits currently update the active app session while password changes call the backend endpoint directly

## Useful Commands

```sh
npm run start
npm run android
npm run ios
npx expo start --clear
```
