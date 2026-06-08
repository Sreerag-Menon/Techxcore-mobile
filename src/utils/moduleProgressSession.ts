/** Tracks module-open (timeId 0) calls per publish+content to avoid duplicate DB errors on remount. */

const sentModuleOpenKeys = new Set<string>();

export function moduleOpenKey(coursePublishId: number, contentId: number): string {
  return `${coursePublishId}:${contentId}`;
}

export function hasSentModuleOpen(coursePublishId: number, contentId: number): boolean {
  return sentModuleOpenKeys.has(moduleOpenKey(coursePublishId, contentId));
}

export function markModuleOpenSent(coursePublishId: number, contentId: number): void {
  sentModuleOpenKeys.add(moduleOpenKey(coursePublishId, contentId));
}

export function clearModuleOpenSentForPublish(coursePublishId: number): void {
  const prefix = `${coursePublishId}:`;
  for (const key of sentModuleOpenKeys) {
    if (key.startsWith(prefix)) {
      sentModuleOpenKeys.delete(key);
    }
  }
}
