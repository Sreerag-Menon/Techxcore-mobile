/** Endpoints in the course listing → consumption flow that always get structured logs. */
export const PLAYER_API_ENDPOINTS = {
  STUDENT_CLASSES: '/get_all_student_class',
  COURSE_PUBLISHINGS: '/get_trainee_course_publishings',
  COURSE_HIER: '/get_trainee_course_publish_hier_v2',
  CREDIT_TIME: '/insert_update_trainee_credit_time',
  MODULE_TIME: '/insert_update_trainee_module_time',
  CURRENT_MODULE: '/get_trainee_current_module',
  TRAINEE_POINTS: '/insert_update_trainee_points',
} as const;

export type PlayerApiLogPhase = 'request' | 'response' | 'error';

const TRACKED = new Set<string>(Object.values(PLAYER_API_ENDPOINTS));

export function isPlayerApiEndpoint(endpoint: string): boolean {
  return TRACKED.has(endpoint);
}

export function logPlayerApiCall(
  endpoint: string,
  phase: PlayerApiLogPhase,
  payload?: unknown,
): void {
  if (!TRACKED.has(endpoint)) return;

  const prefix = `[PlayerAPI:${endpoint}]`;
  const message = `${prefix} ${phase}`;

  if (phase === 'error') {
    console.error(message, payload ?? '');
    return;
  }

  console.log(message, payload ?? '');
}
