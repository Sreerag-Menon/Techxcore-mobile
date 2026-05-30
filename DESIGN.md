# AAI LMS Mobile — Design System & Visual Grammar

This document specifies the design tokens, component standards, and visual guidelines for the AAI Learning Management System Mobile Companion app.

---

## 1. Core Philosophy

The design system is built around a **Refined Materiality** aesthetic — physics-forward, typographically confident, structured, and focused. It avoids the generic "AI glow" (purple/blue highlights) in favor of a customized, high-contrast palette that ensures long-term comfort, excellent readability, and a premium native-first feel.

Mobile and web diverge intentionally. The web portal uses a classic Indigo/Purple scheme, while mobile introduces **Citrus Teal** with a **Deep Slate** foundation. This differentiates the companion mobile app as a focused, personal dashboard and a modern utility, rather than an identical mirror.

---

## 2. Color Palette (Slate + Citrus Teal)

Colors have been selected for WCAG AA conformance on text/background contrast. Interactive surfaces utilize one clear, desaturated green-blue accent that acts as the signature brand marker.

### Light Mode

| Token | Hex Value | Intent / Description | Contrast |
|---|---|---|---|
| `primary` | `#0D9488` | Teal 600 — Accent color for primary buttons, active icons | 4.6:1 on White |
| `primaryLight` | `#CCFBF1` | Teal 100 — Background for secondary tags/chips | — |
| `primaryDark` | `#0F766E` | Teal 700 — pressed states on CTA buttons | — |
| `secondary` | `#F59E0B` | Amber 500 — Accent color representing parents' portal views | — |
| `background` | `#F5F7F9` | Slate 50 — Cooler-than-white off-white to reduce glare | — |
| `surface` | `#FFFFFF` | Solid white for cards, panels, and input fields | — |
| `surfaceRaised` | `#F0F4F8` | Slate 100 — Depth layer for sheets, modals, elevated card base | — |
| `text` | `#0D1117` | Cool near-black for primary text | 18:1 on White |
| `textSecondary`| `#4A5568` | Slate 600 — Secondary labels and subtitles | — |
| `textTertiary` | `#718096` | Slate 400 — Disabled states, subtle placeholders | — |
| `border` | `#E2E8F0` | Slate 200 — Hairline separators, non-focused inputs | — |
| `divider` | `#EDF2F7` | Slate 100 — Page dividers, list borders | — |
| `inputBackground` | `#FAFBFC` | Very light slate tint inside form fields | — |

### Dark Mode

| Token | Hex Value | Intent / Description | Contrast |
|---|---|---|---|
| `primary` | `#2DD4BF` | Teal 300 — Vibrant teal optimized for dark-mode readability | 6.5:1 on dark |
| `primaryLight` | `#134E4A` | Teal 900 — Deep green-blue chip/tag backgrounds | — |
| `primaryDark` | `#5EEAD4` | Teal 200 — Hover/pressed state highlights on dark surfaces | — |
| `secondary` | `#FBBF24` | Amber 400 — Amber secondary highlights for parent dashboard indicators | — |
| `background` | `#0D1117` | Warm cool-dark (GitHub Dark base) — Rich dark gray (not blue-black) | — |
| `surface` | `#161B22` | One level up from background — standard card background | — |
| `surfaceRaised` | `#21262D` | Elevates modal sheets or floating overlays | — |
| `text` | `#E6EDF3` | Cool off-white for primary readability | — |
| `textSecondary`| `#8B949E` | Secondary description labels, active tabs | — |
| `textTertiary` | `#6E7681` | Disabled text, input helpers | — |
| `border` | `#30363D` | Dark border strokes | — |
| `divider` | `#21262D` | Panel dividers | — |
| `inputBackground` | `#1C2128` | Deep slate-gray inside form inputs | — |

---

## 3. Typography (Satoshi)

The system relies on **Satoshi**, a geometric sans-serif with excellent legibility at tiny scales and dramatic authority at large display sizes.

### Font Family Map
In style properties, we reference the following loaded font families:
- `regular`: `Satoshi-Regular`
- `medium`: `Satoshi-Medium`
- `bold`: `Satoshi-Bold`
- `black`: `Satoshi-Black`
- `system`: Default system fallback (`System`)

### Typography Scale
- **`xs`** (12px / Line Height: 18px / Tracking: +0.2) — Caption, footnotes, input error labels
- **`sm`** (14px / Line Height: 20px / Tracking: +0.1) — Secondary buttons, description text, badges
- **`base`** (16px / Line Height: 24px / Tracking: 0) — Body text, list values, input field content
- **`lg`** (18px / Line Height: 28px / Tracking: -0.1) — Content highlights, small card headers
- **`xl`** (20px / Line Height: 30px / Tracking: -0.2) — Screen sub-headers, section titles
- **`2xl`** (24px / Line Height: 32px / Tracking: -0.3) — Large card titles
- **`3xl`** (30px / Line Height: 40px / Tracking: -0.5) — Modal headers
- **`4xl`** (36px / Line Height: 48px / Tracking: -0.8) — Standard display titles
- **`display`** (40px / Line Height: 48px / Tracking: -0.8) — Auth screen headings
- **`hero`** (48px / Line Height: 56px / Tracking: -0.96) — Major metric display moments

---

## 4. Spacing Scale

Based on a standard 8pt/4pt system for fluid grid alignment:

- `xs`  : 4dp
- `sm`  : 8dp
- `md`  : 12dp
- `lg`  : 16dp
- `xl`  : 20dp
- `2xl` : 24dp
- `3xl` : 32dp
- `4xl` : 40dp
- `5xl` : 48dp
- `6xl` : 64dp
- `7xl` : 80dp

---

## 5. UI Components & Layouts

All modern controls utilize continuous curvature curves (`borderCurve: 'continuous'`) to avoid raw, sharp corners on iOS and modern Android surfaces.

### Button (`Button.tsx`)
- **Visuals**: Primary variant uses pill shape (`borderRadius: 999`), other variants use squircle shape (`borderRadius: 12`).
- **Interactions**: Animated spring scale (`0.97` scaling on press-down) using Reanimated, coupled with soft haptic impact (`expo-haptics`) on iOS.

### Input (`Input.tsx`)
- **Visuals**: Frosted floating labels that translate smoothly up on focus. SVG outline eye icons replace legacy emoji toggles.
- **Feedback**: A subtle `boxShadow` ring surrounds the input when focused (`0 0 0 3px colors.primaryLight`), creating a glow that outlines the boundaries cleanly.

### GlassCard (`GlassCard.tsx`)
- **Visuals**: A custom frosted container simulating web's `backdrop-filter: blur`.
- **Styling**: `rgba` translucent base background, high-contrast borders, continuous curves, and subtle double-shadow outlines.

### AuthShell (`AuthShell.tsx`)
- **Background**: Stable multi-stop linear gradient (`LinearGradient` from `expo-linear-gradient`). Floating glass card floats in the center.
- **Responsive**: Adapts gracefully on tablets to center the container within a bounded `560dp` safe area, preventing excessive horizontal stretching.

---

## 6. Motion Vocabulary

Motion in AAI LMS Mobile is physical, spring-driven, and deliberate. It serves to establish spatial relations, reassure user action, and guide screen transitions.

### Spring Dial Settings
- **Damping**: `20` (smooth decelerating ease without bouncy overshoot)
- **Stiffness**: `300` (alert, crisp reaction)
- **Dials**: `VARIANCE=6` / `MOTION=7` / `DENSITY=3` (highly fluid yet focused on text density)

### Animation Library
1. **Screen Entrances**: Content springs upward into view using Reanimated `FadeInDown.springify().damping(20)`.
2. **Transition Swaps**: Transitioning between cards in the auth stack flows from right-to-left. Exiting cards fade out upward (`FadeOutUp.duration(200)`), while entering content springs up into place, making the interface feel unified.
3. **Micro-Feedback**: Forms and inputs that fail validation execute an animated horizontal shake (`withSequence` on a shared offset value).
4. **Reduced Motion**: All physics and keyframe transitions are automatically audited against the operating system's accessibility configurations using `useReducedMotion()`. If reduced motion is active, transitions instantly snap, ensuring compliance and comfort.
