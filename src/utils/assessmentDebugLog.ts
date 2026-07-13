/** Dev-only structured logs for assessment engine debugging. */

const PREFIX = '[Assessment]';

export function logAssessment(event: string, payload?: Record<string, unknown>): void {
  if (!__DEV__) return;
  if (payload) {
    console.log(`${PREFIX} ${event}`, payload);
    return;
  }
  console.log(`${PREFIX} ${event}`);
}

export function logAssessmentWarn(event: string, payload?: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.warn(`${PREFIX} ${event}`, payload ?? '');
}

export function logAssessmentError(event: string, payload?: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.error(`${PREFIX} ${event}`, payload ?? '');
}
