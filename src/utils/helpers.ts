/** General-purpose utility helpers */

// --------------------------------------------------------------------------
// Date formatting
// --------------------------------------------------------------------------

/**
 * Format an ISO date string or Date object to a human-readable form.
 * @example formatDate('2024-06-15T10:30:00Z') → "Jun 15, 2024"
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', options);
}

/**
 * Return a relative time string such as "2 hours ago" or "in 3 days".
 */
export function timeAgo(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const abs = Math.abs(diffMs);
  const sign = diffMs >= 0 ? -1 : 1; // past vs future

  const seconds = Math.floor(abs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return diffMs >= 0 ? 'just now' : 'in a moment';
  if (minutes < 60)
    return sign < 0 ? `${minutes}m ago` : `in ${minutes}m`;
  if (hours < 24)
    return sign < 0 ? `${hours}h ago` : `in ${hours}h`;
  return sign < 0 ? `${days}d ago` : `in ${days}d`;
}

// --------------------------------------------------------------------------
// String utilities
// --------------------------------------------------------------------------

/**
 * Extract initials from a name.
 * @example getInitials('John Doe') → "JD"
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

/**
 * Truncate text to a maximum character length and append ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Capitalise the first letter of a string.
 */
export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --------------------------------------------------------------------------
// Duration formatting
// --------------------------------------------------------------------------

/**
 * Convert a duration in minutes to a readable string.
 * @example formatDuration(90) → "1h 30m"
 * @example formatDuration(45) → "45m"
 */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format seconds (e.g. video playback position) as MM:SS or HH:MM:SS.
 */
export function formatSeconds(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
