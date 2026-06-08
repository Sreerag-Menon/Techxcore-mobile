import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus, StyleSheet, Text, View } from 'react-native';

import { asNumber } from '../../api/normalize';
import { HTML_EDITOR_MODULE_TYPE, type CourseModule } from '../../types/course.types';
import { useTheme } from '../../theme';
import { asyncStorage, buildStorageKey } from '../../utils/storage';
import { moduleTracksPlaybackTime, needsManualModuleCompletion } from '../../utils/moduleCompletion';
import {
  collectProgressPersistBlockers,
  logProgressDiag,
  logProgressGate,
} from '../../utils/progressDiagnostics';
import {
  hasSentModuleOpen,
  markModuleOpenSent,
} from '../../utils/moduleProgressSession';
import {
  useSaveModuleProgressMutation,
  type SaveModuleProgressArgs,
} from '../../redux/api/playerApi';
import { VideoPlayer } from './VideoPlayer';
import { YoutubeModulePlayer } from './YoutubeModulePlayer';
import { VimeoModulePlayer } from './VimeoModulePlayer';
import { PdfPlayer } from './PdfPlayer';
import { AudioPlayer } from './AudioPlayer';
import { HtmlPlayer } from './HtmlPlayer';
import { AssessmentRunner } from './AssessmentRunner';
import { PlayerShell } from './PlayerShell';
import { FullscreenModal } from './FullscreenModal';

export type PlayerLayout = 'inline' | 'fullscreen';

export type PlayerContainerProps = {
  coursePublishId: number;
  courseId?: number;
  curriculumId?: number;
  memberId?: number;
  acadYearId?: number;
  module: CourseModule;
  /** Course publish setting: allow video seeking (default true). */
  seekable?: boolean;
  studyMapTriggerIntervalMs?: number;
  onSectionReady?: () => void;
  onModuleComplete?: (
    module: CourseModule,
    positions?: { lastViewedPos: number; maxViewedPos: number },
  ) => void;
};

function supportsFullscreen(module: CourseModule): boolean {
  if (module.type === 'video') {
    return true;
  }
  if (module.type === 'pdf') return true;
  if (
    module.type === 'html' ||
    module.type === 'embedded' ||
    module.type === 'ppt' ||
    module.type === HTML_EDITOR_MODULE_TYPE ||
    module.type === 'scorm'
  ) {
    return true;
  }
  return false;
}

function usesPlayerShell(module: CourseModule): boolean {
  return module.type !== 'test' && module.type !== 'survey';
}

export function PlayerContainer({
  coursePublishId,
  courseId,
  curriculumId,
  memberId,
  acadYearId,
  module,
  seekable = true,
  studyMapTriggerIntervalMs = 30_000,
  onSectionReady,
  onModuleComplete,
}: PlayerContainerProps) {
  const { colors } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveProgress] = useSaveModuleProgressMutation();
  // Capture seek position once per module switch — immune to hierarchy re-renders
  const [frozenSeek, setFrozenSeek] = useState({
    contentId: module.contentId,
    seekSeconds: module.summary?.lastPositionSeconds ?? 0,
    maxSeconds: module.summary?.totalTimeSeconds ?? (module.summary?.lastPositionSeconds ?? 0),
  });

  // Reset when switching to a different module
  if (frozenSeek.contentId !== module.contentId) {
    setFrozenSeek({
      contentId: module.contentId,
      seekSeconds: module.summary?.lastPositionSeconds ?? 0,
      maxSeconds: module.summary?.totalTimeSeconds ?? (module.summary?.lastPositionSeconds ?? 0),
    });
  }

  const initialSeekSeconds = frozenSeek.seekSeconds;
  const initialMaxSeconds = frozenSeek.maxSeconds;
  const latestSecondsRef = useRef<number>(Math.max(0, initialSeekSeconds));
  const maxViewedSecondsRef = useRef<number>(
    Math.max(initialSeekSeconds, initialMaxSeconds),
  );
  const isAppActiveRef = useRef(true);
  const mountBaselineSecondsRef = useRef(0);
  const playbackAdvancedRef = useRef(false);
  const lastSavedPositionRef = useRef<number>(-1);
  const lastPersistAtRef = useRef(0);
  const progressBaseRef = useRef<Omit<SaveModuleProgressArgs, 'timeId' | 'inProgress'> | null>(null);
  const progressDiagCtxRef = useRef<Record<string, unknown>>({});
  const canPersistProgressRef = useRef(false);
  const saveProgressRef = useRef(saveProgress);
  const studyMapIntervalRef = useRef(studyMapTriggerIntervalMs);

  const tracksPlaybackTime = moduleTracksPlaybackTime(module);
  const manualCompletion = needsManualModuleCompletion(module);
  const canFullscreen = supportsFullscreen(module);
  const shellWrapped = usesPlayerShell(module);
  const showShellFullscreenButton = canFullscreen && module.type !== 'video';

  const resolvedMemberId = useMemo(() => {
    const id = asNumber(memberId, Number.NaN);
    return Number.isFinite(id) ? id : undefined;
  }, [memberId]);

  const resolvedCourseId = useMemo(() => {
    const id = asNumber(courseId, Number.NaN);
    return Number.isFinite(id) ? id : undefined;
  }, [courseId]);

  const resolvedCurriculumId = useMemo(() => {
    const id = asNumber(curriculumId, Number.NaN);
    return Number.isFinite(id) ? id : undefined;
  }, [curriculumId]);

  const progressDiagCtx = useMemo(
    () => ({
      coursePublishId,
      courseId: resolvedCourseId,
      curriculumId: resolvedCurriculumId,
      memberId: resolvedMemberId,
      contentId: module.contentId,
      moduleType: module.type,
    }),
    [
      coursePublishId,
      module.contentId,
      module.type,
      resolvedCourseId,
      resolvedCurriculumId,
      resolvedMemberId,
    ],
  );

  const persistBlockers = useMemo(
    () => collectProgressPersistBlockers(progressDiagCtx),
    [progressDiagCtx],
  );

  const canPersistProgress = persistBlockers.length === 0;

  const progressBase = useMemo((): Omit<SaveModuleProgressArgs, 'timeId' | 'inProgress'> | null => {
    if (
      !canPersistProgress ||
      resolvedCourseId == null ||
      resolvedCurriculumId == null ||
      resolvedMemberId == null
    ) {
      return null;
    }
    return {
      coursePublishId,
      courseId: resolvedCourseId,
      curriculumId: resolvedCurriculumId,
      memberId: resolvedMemberId,
      contentId: module.contentId,
      acadYearId,
    };
  }, [
    acadYearId,
    canPersistProgress,
    coursePublishId,
    module.contentId,
    resolvedCourseId,
    resolvedCurriculumId,
    resolvedMemberId,
  ]);

  useEffect(() => {
    progressBaseRef.current = progressBase;
    progressDiagCtxRef.current = progressDiagCtx;
    canPersistProgressRef.current = canPersistProgress;
    saveProgressRef.current = saveProgress;
    studyMapIntervalRef.current = studyMapTriggerIntervalMs;
  }, [canPersistProgress, progressBase, progressDiagCtx, saveProgress, studyMapTriggerIntervalMs]);

  const persistProgress = useCallback(
    (
      reason: 'playback' | 'unmount' | 'background' | 'local_restore',
      overrides: Partial<SaveModuleProgressArgs> & { invalidateCurrentModule?: boolean },
    ) => {
      const base = progressBaseRef.current;
      const ctx = progressDiagCtxRef.current;
      if (!base) {
        logProgressDiag('persist:skipped', { reason, cause: 'no_progress_base', ...ctx });
        return;
      }
      const payload = {
        ...base,
        timeId: '1' as const,
        inProgress: 1 as const,
        ...overrides,
      };
      logProgressDiag('persist:attempt', {
        reason,
        lastViewedPos: payload.lastViewedPos,
        maxViewedPos: payload.maxViewedPos,
        ...ctx,
      });
      void saveProgressRef
        .current({
          ...payload,
          invalidateCurrentModule: false,
        })
        .catch((error) => {
          logProgressDiag('persist:mutation_failed', { reason, error, ...ctx });
        });
    },
    [],
  );

  const lastLoggedPlaybackSecond = useRef(-1);

  const updatePlaybackPosition = useCallback(
    (seconds: number) => {
      const safe = Math.max(0, seconds);
      if (safe > mountBaselineSecondsRef.current + 0.5) {
        playbackAdvancedRef.current = true;
      }
      latestSecondsRef.current = safe;
      maxViewedSecondsRef.current = Math.max(maxViewedSecondsRef.current, safe);
      const floored = Math.floor(safe);
      if (floored !== lastLoggedPlaybackSecond.current && floored % 10 === 0) {
        lastLoggedPlaybackSecond.current = floored;
        logProgressDiag('playback:position', {
          seconds: floored,
          maxViewed: Math.floor(maxViewedSecondsRef.current),
          contentId: module.contentId,
        });
      }

      if (!canPersistProgressRef.current || !tracksPlaybackTime) return;
      if (!isAppActiveRef.current) return;

      const now = Date.now();
      if (now - lastPersistAtRef.current < studyMapIntervalRef.current) return;
      if (Math.abs(safe - lastSavedPositionRef.current) < 0.5) return;

      lastPersistAtRef.current = now;
      lastSavedPositionRef.current = safe;
      persistProgress('playback', {
        lastViewedPos: safe,
        maxViewedPos: maxViewedSecondsRef.current,
      });
    },
    [module.contentId, persistProgress, tracksPlaybackTime],
  );

  useEffect(() => {
    setIsFullscreen(false);
  }, [module.contentId]);

  useEffect(() => {
    logProgressGate('canPersistProgress', canPersistProgress, progressDiagCtx, persistBlockers);
    logProgressDiag('module:loaded', {
      tracksPlaybackTime,
      manualCompletion,
      initialSeekSeconds,
      initialMaxSeconds,
      moduleStatus: module.status,
      ...progressDiagCtx,
    });
  }, [
    canPersistProgress,
    initialMaxSeconds,
    initialSeekSeconds,
    manualCompletion,
    module.contentId,
    module.status,
    persistBlockers,
    progressDiagCtx,
    tracksPlaybackTime,
  ]);

  useEffect(() => {
    const seek = Math.max(0, initialSeekSeconds);
    const max = Math.max(seek, initialMaxSeconds);
    latestSecondsRef.current = seek;
    maxViewedSecondsRef.current = max;
    mountBaselineSecondsRef.current = seek;
    playbackAdvancedRef.current = false;
    lastLoggedPlaybackSecond.current = -1;
    lastSavedPositionRef.current = -1;
    lastPersistAtRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline reset only when switching modules
  }, [module.contentId]);

  useEffect(() => {
    const seek = Math.max(0, initialSeekSeconds);
    const max = Math.max(seek, initialMaxSeconds);
    if (seek > latestSecondsRef.current) {
      latestSecondsRef.current = seek;
      maxViewedSecondsRef.current = Math.max(maxViewedSecondsRef.current, max);
      if (!playbackAdvancedRef.current) {
        mountBaselineSecondsRef.current = seek;
      }
    }
  }, [initialMaxSeconds, initialSeekSeconds]);

  useEffect(() => {
    if (!canPersistProgress || !progressBase) return;
    if (hasSentModuleOpen(coursePublishId, module.contentId)) {
      logProgressDiag('persist:skipped', {
        reason: 'module_open',
        cause: 'already_sent_this_session',
        ...progressDiagCtx,
      });
      return;
    }

    markModuleOpenSent(coursePublishId, module.contentId);
    logProgressDiag('persist:attempt', {
      reason: 'module_open',
      timeId: '0',
      ...progressDiagCtx,
    });
    void saveProgress({
      ...progressBase,
      timeId: '0',
      inProgress: 1,
      invalidateCurrentModule: false,
    }).catch((error) => {
      logProgressDiag('persist:mutation_failed', { reason: 'module_open', error, ...progressDiagCtx });
    });
  }, [canPersistProgress, coursePublishId, module.contentId, progressBase, progressDiagCtx, saveProgress]);

  useEffect(() => {
    if (!tracksPlaybackTime || !canPersistProgress) return;

    const storageKey = buildStorageKey('progress:last', coursePublishId, module.contentId);

    void (async () => {
      const persisted = await asyncStorage.getItem<number>(storageKey);
      logProgressDiag('local:progress_cache', {
        storageKey,
        value: persisted,
        note: 'Nothing writes this key today — nonzero means stale data only',
      });
      if (typeof persisted === 'number' && Number.isFinite(persisted) && persisted > 0) {
        updatePlaybackPosition(persisted);
        persistProgress('local_restore', {
          lastViewedPos: persisted,
          maxViewedPos: maxViewedSecondsRef.current,
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- local restore once per module
  }, [canPersistProgress, coursePublishId, module.contentId, tracksPlaybackTime]);

  useEffect(() => {
    const onAppStateChange = (next: AppStateStatus) => {
      const wasActive = isAppActiveRef.current;
      isAppActiveRef.current = next === 'active';
      if (wasActive && next !== 'active' && playbackAdvancedRef.current) {
        const latest = latestSecondsRef.current;
        lastSavedPositionRef.current = latest;
        persistProgress('background', {
          lastViewedPos: latest,
          maxViewedPos: maxViewedSecondsRef.current,
        });
      }
    };
    const appSub = AppState.addEventListener('change', onAppStateChange);

    return () => {
      appSub.remove();
      const latest = latestSecondsRef.current;
      const baseline = mountBaselineSecondsRef.current;
      const ctx = progressDiagCtxRef.current;
      if (!playbackAdvancedRef.current && latest <= baseline + 0.5) {
        logProgressDiag('persist:skipped', {
          reason: 'unmount',
          cause: 'no_playback_advance',
          latest,
          baseline,
          ...ctx,
        });
        return;
      }
      lastSavedPositionRef.current = latest;
      persistProgress('unmount', {
        lastViewedPos: latest,
        maxViewedPos: maxViewedSecondsRef.current,
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lifecycle tied to module switch only
  }, [module.contentId]);

  const handleComplete = useCallback(() => {
    if (manualCompletion) {
      logProgressDiag('completion:skipped', {
        cause: 'manual_completion_required',
        ...progressDiagCtx,
      });
      return;
    }
    const positions = tracksPlaybackTime
      ? {
          lastViewedPos: latestSecondsRef.current,
          maxViewedPos: maxViewedSecondsRef.current,
        }
      : undefined;
    logProgressDiag('completion:triggered', {
      positions,
      moduleStatus: module.status,
      ...progressDiagCtx,
    });
    onModuleComplete?.(module, positions);
  }, [manualCompletion, module, onModuleComplete, progressDiagCtx, tracksPlaybackTime]);

  const handleFullscreenRequest = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleFullscreenClose = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const renderPlayer = (layout: PlayerLayout) => {
    if (module.type === 'video') {
      if (module.provider === 'youtube') {
        return (
          <YoutubeModulePlayer
            url={module.url}
            initialSeekSeconds={initialSeekSeconds}
            seekable={seekable}
            onProgress={updatePlaybackPosition}
            onEnd={handleComplete}
          />
        );
      }

      const onFullscreenRequest =
        layout === 'inline' && canFullscreen ? handleFullscreenRequest : undefined;

      if (module.provider === 'vimeo') {
        return (
          <VimeoModulePlayer
            url={module.url}
            layout={layout}
            initialSeekSeconds={initialSeekSeconds}
            onProgress={updatePlaybackPosition}
            onEnd={handleComplete}
            onFullscreenRequest={onFullscreenRequest}
          />
        );
      }
      return (
        <VideoPlayer
          url={module.url}
          layout={layout}
          initialSeekSeconds={initialSeekSeconds}
          seekable={seekable}
          onProgress={updatePlaybackPosition}
          onEnd={handleComplete}
          onFullscreenRequest={onFullscreenRequest}
        />
      );
    }

    if (module.type === 'pdf') {
      return <PdfPlayer url={module.url} layout={layout} onComplete={handleComplete} />;
    }

    if (module.type === 'audio') {
      return (
        <AudioPlayer
          url={module.url}
          layout={layout}
          initialSeekSeconds={initialSeekSeconds}
          onProgress={updatePlaybackPosition}
          onComplete={handleComplete}
        />
      );
    }

    if (
      module.type === 'html' ||
      module.type === 'embedded' ||
      module.type === 'ppt' ||
      module.type === HTML_EDITOR_MODULE_TYPE
    ) {
      return <HtmlPlayer module={module} onSectionReady={onSectionReady} />;
    }

    if (module.type === 'scorm') {
      return (
        <HtmlPlayer
          module={module}
          onCommit={() => {
            // commit events are handled by periodic progress persistence for now
          }}
          onTerminate={(payload) => {
            if (payload.completionStatus === 'completed') {
              handleComplete();
            }
          }}
        />
      );
    }

    if (module.type === 'test' || module.type === 'survey') {
      return (
        <AssessmentRunner
          testId={module.testId}
          onComplete={() => {
            handleComplete();
          }}
        />
      );
    }

    return (
      <View style={styles.fallback}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
          Player for “{module.type}” will be available shortly.
        </Text>
      </View>
    );
  };

  const inlinePlayer = renderPlayer('inline');
  const fullscreenPlayer = isFullscreen ? renderPlayer('fullscreen') : null;

  if (!shellWrapped) {
    return <View style={styles.assessmentWrap}>{inlinePlayer}</View>;
  }

  return (
    <>
      <PlayerShell
        module={module}
        onFullscreen={canFullscreen ? handleFullscreenRequest : undefined}
        showFullscreenButton={showShellFullscreenButton}
      >
        {inlinePlayer}
      </PlayerShell>

      <FullscreenModal visible={isFullscreen} onClose={handleFullscreenClose}>
        <View style={styles.fullscreenContent}>{fullscreenPlayer}</View>
      </FullscreenModal>
    </>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fullscreenContent: {
    flex: 1,
    width: '100%',
  },
  assessmentWrap: {
    width: '100%',
    minHeight: 360,
  },
});
