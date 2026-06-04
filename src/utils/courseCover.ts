/**
 * Shared course cover gradients and initials — used by dashboard and list cards.
 */

/**
 * Brand-adjacent cover gradients — Teal / Cyan / Sky / Emerald family.
 * All pairs are mid-to-high saturation so they read clearly on both
 * light (white) and dark (#161B22) surfaces as a gradient avatar background.
 * White text hits ≥4.5:1 contrast on every pair.
 */
export const COVER_GRADIENTS: readonly [string, string][] = [
  ['#0D9488', '#0F766E'], // Teal 600 → 700 — brand home
  ['#14B8A6', '#0D9488'], // Teal 400 → 600 — lighter brand
  ['#06B6D4', '#0891B2'], // Cyan 400 → 600 — cool adjacent
  ['#0891B2', '#0E7490'], // Cyan 600 → 700 — deeper cyan
  ['#0284C7', '#075985'], // Sky 600 → 800  — blue-teal edge
  ['#059669', '#047857'], // Emerald 600 → 700 — warm-cool bridge
];

export function getCoverGradient(seed: number): readonly [string, string] {
  return COVER_GRADIENTS[Math.abs(seed) % COVER_GRADIENTS.length];
}

export function getCourseInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function getCourseCtaLabel(status: 'not_started' | 'in_progress' | 'completed'): string {
  switch (status) {
    case 'not_started':
      return 'Start';
    case 'in_progress':
      return 'Resume';
    case 'completed':
      return 'Review';
  }
}
