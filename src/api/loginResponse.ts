import { asNumber, asString, extractItem } from './normalize';

export type LoginStatusRow = {
  statusvalue: number;
  statusText: string;
  alreadyLoggedIn?: boolean;
  uMemberId?: string;
  u_member_id?: string;
  face_login?: number;
};

export function parseLoginStatusRow(payload: unknown): LoginStatusRow | null {
  const item = extractItem<Record<string, unknown>>(payload);
  if (!item) return null;

  return {
    statusvalue: asNumber(item.statusvalue ?? item.StatusValue, -1),
    statusText: asString(item.statusText ?? item.StatusText, ''),
    alreadyLoggedIn:
      typeof item.alreadyLoggedIn === 'boolean'
        ? item.alreadyLoggedIn
        : undefined,
    uMemberId: asString(item.uMemberId, ''),
    u_member_id: asString(item.u_member_id, ''),
    face_login: asNumber(item.face_login, 0),
  };
}

export function isAlreadyLoggedIn(row: LoginStatusRow | null): boolean {
  return row?.statusvalue === 7;
}

export function getUmemberId(row: LoginStatusRow | null): string {
  if (!row) return '';
  return (row.uMemberId || row.u_member_id || '').trim();
}

export function isLoginSuccess(row: LoginStatusRow | null, token: string): boolean {
  if (!row) return false;
  const hasToken = token.trim().length > 0;
  return (row.statusvalue === 1 || row.statusvalue === 6) && hasToken;
}

export function getStatusErrorMessage(row: LoginStatusRow | null): string {
  if (!row) return 'Login failed.';
  const statusText = row.statusText?.trim();

  if (statusText) return statusText;

  switch (row.statusvalue) {
    case 0:
      return 'Incorrect credentials.';
    case 4:
    case 5:
    case 6:
      return 'Invalid credentials.';
    case 7:
      return 'You are already logged in on another device.';
    default:
      return 'Login failed.';
  }
}

