import { APP_CONFIG } from '@/constants/config';

export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: `At least ${APP_CONFIG.MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= APP_CONFIG.MIN_PASSWORD_LENGTH,
    },
    {
      id: 'lower',
      label: 'One lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      id: 'upper',
      label: 'One uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'digit',
      label: 'One number',
      met: /\d/.test(password),
    },
    {
      id: 'symbol',
      label: 'One special character',
      met: /[^0-9a-zA-Z]/.test(password),
    },
  ];
}

/** Returns validation error messages (empty when valid). Matches web `validatePassword`. */
export function validatePassword(password: string): string[] {
  return getPasswordRequirements(password)
    .filter((req) => !req.met)
    .map((req) => req.label);
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password).length === 0;
}
