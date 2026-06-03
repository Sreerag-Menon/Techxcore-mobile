import { useEffect, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus, Text, View } from 'react-native';

import type { CourseModule } from '../../types/course.types';
import { useTheme } from '../../theme';
import { asyncStorage } from '../../utils/storage';
import {
  useRecordPointsMutation,
  useSaveModuleProgressMutation,
} from '../../redux/api/playerApi';
import { VideoPlayer } from './VideoPlayer';
import { YoutubeModulePlayer } from './YoutubeModulePlayer';
import { VimeoModulePlayer } from './VimeoModulePlayer';
import { PdfPlayer } from './PdfPlayer';
import { AudioPlayer } from './AudioPlayer';
import { HtmlPlayer } from './HtmlPlayer';
import { AssessmentRunner } from './AssessmentRunner';

export type PlayerContainerProps = {
  coursePublishId: number;
  curriculumId?: number;
  module: CourseModule;
  studyMapTriggerIntervalMs?: number;
  onModuleComplete?: (module: CourseModule) => void;
};

export function PlayerContainer({
  coursePublishId,
  curriculumId,
  module,
  studyMapTriggerIntervalMs = 30_000,
  onModuleComplete,
}: PlayerContainerProps) {
  const { colors } = useTheme();
  const [saveProgress] = useSaveModuleProgressMutation();
  const [recordPoints] = useRecordPointsMutation();
  const initialSeekSeconds = module.summary?.lastPositionSeconds ?? 0;
  const latestSecondsRef = useRef<number>(Math.max(0, initialSeekSeconds));
  const isAppActiveRef = useRef(true);

  const progressArgs = useMemo(
    () => ({
      coursePublishId,
      curriculumId,
      contentId: module.contentId,
    }),
    [coursePublishId, curriculumId, module.contentId],
  );

  useEffect(() => {
    latestSecondsRef.current = Math.max(0, initialSeekSeconds);
    const storageKey = `progress:last:${coursePublishId}:${module.contentId}`;

    void (async () => {
      const persisted = await asyncStorage.getItem<number>(storageKey);
      if (typeof persisted === 'number' && Number.isFinite(persisted) && persisted > 0) {
        void saveProgress({
          ...progressArgs,
          seconds: persisted,
          action: 'progress',
        }).catch(() => {});
      }
    })();

    const onAppStateChange = (next: AppStateStatus) => {
      isAppActiveRef.current = next === 'active';
    };
    const appSub = AppState.addEventListener('change', onAppStateChange);

    const id = setInterval(() => {
      if (!isAppActiveRef.current) return;
      void saveProgress({
        ...progressArgs,
        seconds: Math.max(0, latestSecondsRef.current),
        action: 'progress',
      }).catch(() => {
        void asyncStorage.setItem(storageKey, Math.max(0, latestSecondsRef.current));
      });
    }, studyMapTriggerIntervalMs);

    return () => {
      clearInterval(id);
      appSub.remove();
      void saveProgress({
        ...progressArgs,
        seconds: Math.max(0, latestSecondsRef.current),
        action: 'summary',
      }).catch(() => {
        void asyncStorage.setItem(storageKey, Math.max(0, latestSecondsRef.current));
      });
    };
  }, [
    coursePublishId,
    initialSeekSeconds,
    module.contentId,
    progressArgs,
    saveProgress,
    studyMapTriggerIntervalMs,
  ]);

  const handleComplete = () => {
    void recordPoints({
      coursePublishId,
      curriculumId,
      contentId: module.contentId,
      completed: true,
    }).catch(() => {});
    onModuleComplete?.(module);
  };

  if (module.type === 'video') {
    if (module.provider === 'youtube') {
      return (
        <YoutubeModulePlayer
          url={module.url}
          initialSeekSeconds={initialSeekSeconds}
          onProgress={(seconds) => {
            latestSecondsRef.current = seconds;
          }}
        />
      );
    }
    if (module.provider === 'vimeo') {
      return (
        <VimeoModulePlayer
          url={module.url}
          initialSeekSeconds={initialSeekSeconds}
          onProgress={(seconds) => {
            latestSecondsRef.current = seconds;
          }}
        />
      );
    }
    return (
      <VideoPlayer
        url={module.url}
        initialSeekSeconds={initialSeekSeconds}
        onProgress={(seconds) => {
          latestSecondsRef.current = seconds;
        }}
        onEnd={handleComplete}
      />
    );
  }

  if (module.type === 'pdf') {
    return <PdfPlayer url={module.url} onComplete={handleComplete} />;
  }

  if (module.type === 'audio') {
    return (
      <AudioPlayer
        url={module.url}
        initialSeekSeconds={initialSeekSeconds}
        onProgress={(seconds) => {
          latestSecondsRef.current = seconds;
        }}
        onComplete={handleComplete}
      />
    );
  }

  if (module.type === 'html' || module.type === 'embedded' || module.type === 'ppt') {
    return <HtmlPlayer module={module} />;
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
    <View
      style={{
        borderRadius: 16,
        backgroundColor: colors.surface,
        padding: 16,
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
        Player for “{module.type}” will be available shortly.
      </Text>
    </View>
  );
}
