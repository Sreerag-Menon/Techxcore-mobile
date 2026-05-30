# Product

## Register

product

## Users

Students aged 12–22 and their Parents, using Android and iOS devices during school days. Primary context: at home or in school, checking progress, assignments, and communicating with teachers through the LMS. The app is used daily, often in brief sessions (5–15 minutes). Speed of access and trust are more important than feature completeness on any given session.

## Product Purpose

AAI LMS Mobile is the native companion to the AAI Learning Management System web portal. It allows students to track their courses, attendance, and assignments; and parents to monitor their child's progress. The app exists to give students and parents a fast, always-available window into the institution's LMS — without requiring a laptop or browser.

Success looks like: a student can log in, see today's schedule, check a grade, and close the app in under 60 seconds.

## Brand Personality

Focused. Trustworthy. Approachable.

The product should feel like a tool built by people who understand education — not a startup trying to gamify learning. It should convey institutional authority without feeling bureaucratic or cold.

## Anti-references

- **TikTok / Instagram aesthetic**: No bottom-heavy dark social-native UIs, no algorithmic feed design, no entertainment dopamine loops
- **Microsoft Teams grey**: No corporate/enterprise visual heaviness, no grey-on-grey hierarchy, no cluttered toolbars
- **Warm cream "AI" palettes**: No beige/cream/sand backgrounds, no warm brass accents — these read as generic AI product defaults
- **Clone of the web portal**: Mobile is a companion product with its own visual identity — not a copy of the web's indigo/purple color family

## Design Principles

1. **Speed is respect.** The app should load fast and get out of the way. Animations serve feedback, not decoration.
2. **Institutional authority without weight.** The design communicates trust and reliability through clean hierarchy, not heavy borders and grey surfaces.
3. **The student is the primary user.** Every design decision is tested against a 15-year-old on an Android phone in a school corridor.
4. **Dark mode is a first-class experience.** Students use phones at night. Dark mode should be rich, not just an inverted light mode.
5. **One focus per screen.** Auth screens do one thing. Dashboard screens have one primary action. Resist the urge to add secondary content.

## Accessibility & Inclusion

- WCAG AA minimum on all text/background combinations
- Primary accent color (#0D9488 Teal 600) passes 4.6:1 on white
- Reduced motion respected via useReducedMotion() on all spring animations
- Dynamic text sizing respected where RN allows
- All interactive elements have minimum 44dp touch targets
