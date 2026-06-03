# Expo Go native modules — revert guide

Temporary migration to run the app in **Expo Go (SDK 54)** without a custom development build. Native PDF and MMKV (Nitro) were removed and replaced with `react-native-webview` and `@react-native-async-storage/async-storage`.

## Summary

| Field | Value |
|-------|--------|
| Migration date | 2026-05-30 |
| Pre-migration commit | `315ba10217c5b32c2e58d652c4b15fc137f3054c` |
| Purpose | Expo Go compatibility (no dev client required) |
| Revert doc | This file |

**Recommended before any future native restore:**

```bash
git tag expo-go-migration-before 315ba10217c5b32c2e58d652c4b15fc137f3054c
```

## Removed dependencies

| Package | Version (before removal) | Reason |
|---------|--------------------------|--------|
| `react-native-mmkv` | `^4.3.1` | Nitro native module — not in Expo Go |
| `react-native-nitro-modules` | `^0.35.9` | Peer of MMKV v4 |
| `@kishannareshpal/expo-pdf` | `^0.3.2` | Custom native PDF view |
| `react-native-youtube-bridge` | `^2.2.1` | Unused (WebView YouTube player) |
| `react-native-vimeo-bridge` | `^1.2.0` | Unused (WebView Vimeo player) |

## Restore commands

From project root (`Techxcore-mobile`):

```bash
npm install react-native-mmkv@^4.3.1 react-native-nitro-modules@^0.35.9 @kishannareshpal/expo-pdf@^0.3.2
npx expo install --fix
```

Optional (only if you still need bridge packages):

```bash
npm install react-native-youtube-bridge@^2.2.1 react-native-vimeo-bridge@^1.2.0
```

Then revert the per-file changes below (or `git checkout expo-go-migration-before -- <paths>` for files that existed at that commit).

If you use prebuild / native projects:

```bash
npx expo prebuild --clean
```

## Runtime workflow

| Mode | Start command |
|------|----------------|
| **Expo Go** (current) | `npx expo start -c` — do **not** pass `--dev-client` |
| **Dev client** (after revert) | `npx expo start -c --dev-client` or `npx expo run:ios` / `run:android` |

## Per-file changelog

| File | What changed | How to revert |
|------|----------------|---------------|
| `package.json` | Removed 5 packages above | Reinstall packages; restore entries from pre-migration commit |
| `src/components/player/PdfWebView.tsx` | **New** — WebView PDF viewer | Delete file |
| `src/components/player/PdfPlayer.tsx` | `PdfView` → `PdfWebView`; no auto last-page `onComplete` | Restore `PdfView` from `@kishannareshpal/expo-pdf` |
| `src/components/player/CertificateViewer.tsx` | `PdfView` → `PdfWebView` | Same as PdfPlayer |
| `src/components/player/PlayerContainer.tsx` | MMKV → `asyncStorage` for offline progress keys | Restore `createMMKV()` ref pattern |
| `src/components/player/CourseRating.tsx` | MMKV → async `asyncStorage` for prompt flag | Restore sync `storage.getBoolean` / `set` |
| `src/components/player/StudyBuddyChatbot.tsx` | MMKV → `asyncStorage` for chat JSON | Restore `storage.getString` / `set` |
| `src/components/player/HtmlPlayer.tsx` | MMKV → `asyncStorage` on SCORM commit | Restore `storage.set` via MMKV |

View pre-migration file:

```bash
git show 315ba10217c5b32c2e58d652c4b15fc137f3054c:src/components/player/PlayerContainer.tsx
```

## Storage key mapping (unchanged)

These keys are the same; only the backend changed from MMKV to AsyncStorage JSON:

- `progress:last:{coursePublishId}:{contentId}` — number
- `rating:prompted:{coursePublishId}` — boolean
- `scorm:suspend_data:{contentId}` — string
- Study buddy: caller-provided `storageKey` — `ChatMessage[]` JSON

## Known limitations (Expo Go build)

- **PDF**: Rendered in `WebView`; quality and `file://` behavior differ by OS (especially Android). Share/download still use `expo-file-system` + `expo-sharing`.
- **PDF completion**: Native `onPageChanged` (last page) is not available; `PdfPlayer` no longer auto-fires `onComplete` when the user reaches the last page.
- **AsyncStorage**: Progress/rating hydrate asynchronously (may apply one frame after mount).
- **SCORM**: Primary suspend data remains in WebView `localStorage`; AsyncStorage is a backup on commit.

## Quick revert checklist

1. [ ] Tag or note commit `315ba10217c5b32c2e58d652c4b15fc137f3054c`
2. [ ] `npm install` native packages (see Restore commands)
3. [ ] Revert or restore the 7 player files + delete `PdfWebView.tsx`
4. [ ] `npx expo install --fix`
5. [ ] `npx tsc --noEmit`
6. [ ] Run with `--dev-client` or native build; smoke-test PDF, MMKV progress, rating prompt
