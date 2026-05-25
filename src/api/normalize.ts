type UnknownRecord = Record<string, unknown>;

const DEFAULT_KEYS = [
  'data',
  'items',
  'rows',
  'results',
  'records',
  'list',
  'payload',
  'response',
  'result',
];

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapValue(
  value: unknown,
  candidateKeys: string[] = [],
  depth = 0,
): unknown {
  if (depth > 4) return value;
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return value;

  for (const key of [...candidateKeys, ...DEFAULT_KEYS]) {
    if (key in value) {
      return unwrapValue(value[key], candidateKeys, depth + 1);
    }
  }

  const values = Object.values(value);
  if (values.length === 1) {
    return unwrapValue(values[0], candidateKeys, depth + 1);
  }

  return value;
}

export function extractArray<T>(
  value: unknown,
  candidateKeys: string[] = [],
): T[] {
  const unwrapped = unwrapValue(value, candidateKeys);
  if (Array.isArray(unwrapped)) {
    return unwrapped as T[];
  }

  if (isRecord(unwrapped)) {
    for (const key of [...candidateKeys, ...DEFAULT_KEYS]) {
      const nested = unwrapped[key];
      if (Array.isArray(nested)) {
        return nested as T[];
      }
    }
  }

  return [];
}

export function extractItem<T>(
  value: unknown,
  candidateKeys: string[] = [],
): T | null {
  const unwrapped = unwrapValue(value, candidateKeys);
  if (Array.isArray(unwrapped)) {
    return (unwrapped[0] as T | undefined) ?? null;
  }

  if (isRecord(unwrapped)) {
    return unwrapped as T;
  }

  return null;
}

export function extractMessage(
  value: unknown,
  fallback = 'Request completed successfully',
): string {
  if (!isRecord(value)) {
    return fallback;
  }

  const message =
    value.message ??
    value.msg ??
    value.status_message ??
    value.error_description ??
    value.error;

  return typeof message === 'string' && message.trim().length > 0
    ? message
    : fallback;
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }

  return fallback;
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}
