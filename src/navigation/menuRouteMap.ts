import type { MenuItem, MobileRouteTarget } from '@/types/menu.types';

/** Menu names / routes reserved for bottom tabs — excluded from quick actions & more sheet */
const BOTTOM_TAB_PATTERNS = [
  /^dashboard$/i,
  /^home$/i,
  /^programs?$/i,
  /^curriculum$/i,
  /^assessments?$/i,
  /^profile settings?$/i,
];

/** Priority order for quick-action pills (first match wins when filtering API menu) */
export const QUICK_ACTION_PRIORITY: Array<{ match: (item: MenuItem) => boolean }> = [
  { match: (item) => /calendar/i.test(item.menu_name) || item.route === '/calendar' },
  { match: (item) => /timetable|time table|schedule/i.test(item.menu_name) },
  { match: (item) => /messages?|chat/i.test(item.menu_name) || item.route === '/chat' },
  { match: (item) => /attendance|attendence/i.test(item.menu_name) },
  {
    match: (item) =>
      /live sessions?/i.test(item.menu_name) && !isJoinOrPlayback(item.menu_name),
  },
];

const WEB_ROUTE_MAP: Record<string, string> = {
  '/': '/(student)/(tabs)',
  '/curricula': '/(student)/(tabs)/courses',
  '/assessments': '/(student)/(tabs)/assessments',
  '/profile-settings': '/(student)/(tabs)/profile',
  '/calendar': '/(student)/calendar',
  '/chat': '/(student)/messages',
  '/alert': '/(student)/notifications',
  '/attendence': '/(student)/attendance',
  '/attendance': '/(student)/attendance',
  '/join': '/(student)/join',
  '/playback': '/(student)/playback',
  '/training-zone': '/(student)/training-zone',
  '/knowledge-shelf': '/(student)/knowledge-shelf',
  '/StudentSurvey': '/(student)/surveys',
  '/SurveyRouter': '/(student)/surveys',
  '/fee-payment': '/(student)/fee-payment',
  '/StudentRubrics': '/(student)/rubrics',
  '/oldcourses': '/(student)/old-courses',
};

export function normalizeMenuName(name?: string): string {
  return (name ?? '').trim().toLowerCase();
}

export function isJoinOrPlayback(menuName?: string): boolean {
  const lower = normalizeMenuName(menuName);
  return lower === 'join' || lower.includes('playback');
}

export function isBottomTabItem(item: MenuItem): boolean {
  const name = normalizeMenuName(item.menu_name);
  if (item.home === 1 || item.home === true) return true;
  return BOTTOM_TAB_PATTERNS.some((pattern) => pattern.test(name));
}

export function isLiveSessionParent(item: MenuItem): boolean {
  return /live sessions?/i.test(item.menu_name);
}

export function getLiveSessionChildren(items: MenuItem[]): MenuItem[] {
  return items.filter((item) => isJoinOrPlayback(item.menu_name));
}

export function resolveMobileRoute(
  item: MenuItem,
  allItems: MenuItem[] = [],
): MobileRouteTarget {
  const name = item.menu_name;
  const lower = normalizeMenuName(name);

  if (isBottomTabItem(item)) {
    if (/assessment/i.test(lower)) {
      return { type: 'tab', path: '/(student)/(tabs)/assessments' };
    }
    if (/profile/i.test(lower)) {
      return { type: 'tab', path: '/(student)/(tabs)/profile' };
    }
    if (/curriculum|program/i.test(lower)) {
      return { type: 'tab', path: '/(student)/(tabs)/courses' };
    }
    return { type: 'tab', path: '/(student)/(tabs)' };
  }

  if (isLiveSessionParent(item)) {
    const children = getLiveSessionChildren(allItems);
    if (children.length > 0) {
      return {
        type: 'hub',
        path: '/(student)/live-sessions',
        children,
      };
    }
    return { type: 'route', path: '/(student)/live-sessions' };
  }

  if (lower === 'curriculum') {
    return { type: 'tab', path: '/(student)/(tabs)/courses' };
  }

  if (lower.includes('fee management') || lower.includes('fee payment')) {
    return { type: 'route', path: '/(student)/fee-payment' };
  }

  const mapped = WEB_ROUTE_MAP[item.route?.trim() ?? ''];
  if (mapped) {
    return { type: 'route', path: mapped };
  }

  if (/timetable|time table/i.test(name)) {
    return { type: 'route', path: '/(student)/timetable' };
  }

  if (/events?|announcements?/i.test(name)) {
    return { type: 'route', path: '/(student)/events' };
  }

  if (/training zone/i.test(name)) {
    return { type: 'route', path: '/(student)/training-zone' };
  }

  if (/knowledge shelf|shelf/i.test(name)) {
    return { type: 'route', path: '/(student)/knowledge-shelf' };
  }

  if (/survey/i.test(name)) {
    return { type: 'route', path: '/(student)/surveys' };
  }

  if (/rubric/i.test(name)) {
    return { type: 'route', path: '/(student)/rubrics' };
  }

  if (/old courses?/i.test(name)) {
    return { type: 'route', path: '/(student)/old-courses' };
  }

  return { type: 'coming_soon', title: name || 'Feature' };
}

export function getQuickActionPriorityIndex(item: MenuItem): number {
  const index = QUICK_ACTION_PRIORITY.findIndex(({ match }) => match(item));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function partitionMenuItems(items: MenuItem[]): {
  quickActions: MenuItem[];
  moreItems: MenuItem[];
} {
  const visible = items.filter(
    (item) =>
      !item.hidden &&
      !isJoinOrPlayback(item.menu_name) &&
      !isBottomTabItem(item),
  );

  const sorted = [...visible].sort(
    (a, b) => getQuickActionPriorityIndex(a) - getQuickActionPriorityIndex(b),
  );

  const quickActionCandidates = sorted.filter(
    (item) => getQuickActionPriorityIndex(item) < Number.MAX_SAFE_INTEGER,
  );

  const quickActions = quickActionCandidates.slice(0, 5);
  const quickActionIds = new Set(quickActions.map((item) => item.menu_id));

  const moreItems = sorted.filter((item) => !quickActionIds.has(item.menu_id));

  return { quickActions, moreItems };
}

/** All non-tab menu items for the dashboard horizontal quick-access strip */
export function getScrollableMenuItems(items: MenuItem[]): MenuItem[] {
  const { quickActions, moreItems } = partitionMenuItems(items);
  return [...quickActions, ...moreItems];
}

export function navigateTargetToPath(target: MobileRouteTarget): string {
  switch (target.type) {
    case 'tab':
    case 'route':
    case 'hub':
      return target.path;
    default:
      return '/(student)/coming-soon';
  }
}
