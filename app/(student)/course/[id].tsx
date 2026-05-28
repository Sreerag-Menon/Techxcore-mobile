import { useEffect, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, LoadingScreen } from '../../../src/components';
import { ScreenLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchCourseDetails } from '../../../src/redux/slices/courseSlice';
import { setActiveContentId } from '../../../src/redux/slices/playerSlice';
import {
  useGetCourseHierarchyQuery,
  useGetCurrentModuleQuery,
  useSaveCreditTimeMutation,
} from '../../../src/redux/api/playerApi';
import { useTheme } from '../../../src/theme';
import type { CourseModule } from '../../../src/types/course.types';
import { PlayerContainer } from '../../../src/components/player/PlayerContainer';
import { CourseContentSidebar } from '../../../src/components/player/CourseContentSidebar';
import { PlayerTabs } from '../../../src/components/player/PlayerTabs';
import { StudyBuddyChatbot } from '../../../src/components/player/StudyBuddyChatbot';
import { CourseRating } from '../../../src/components/player/CourseRating';
import { CertificateViewer } from '../../../src/components/player/CertificateViewer';

function flattenModules(hierarchy?: { chapters: Array<{ modules: CourseModule[] }> }) {
  if (!hierarchy) return [] as CourseModule[];
  return hierarchy.chapters.flatMap((c) => c.modules);
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const coursePublishId = Number(id);

  const { currentCourse, isLoading: isCourseLoading, error: courseError } = useAppSelector(
    (state) => state.course,
  );
  const activeContentId = useAppSelector((state) => state.player.activeContentId);
  const memberId = useAppSelector((state) => state.user.profile?.member_id);

  const {
    data: hierarchy,
    isLoading: isHierarchyLoading,
    error: hierarchyError,
    refetch: refetchHierarchy,
  } = useGetCourseHierarchyQuery(
    { coursePublishId },
    { skip: !Number.isFinite(coursePublishId) },
  );

  const { data: currentModule } = useGetCurrentModuleQuery(
    { coursePublishId },
    { skip: !Number.isFinite(coursePublishId) },
  );

  const [saveCreditTime] = useSaveCreditTimeMutation();

  useEffect(() => {
    if (!Number.isFinite(coursePublishId)) return;
    void dispatch(fetchCourseDetails({ course_publish_id: coursePublishId }));
  }, [coursePublishId, dispatch]);

  useEffect(() => {
    if (!Number.isFinite(coursePublishId)) return;
    void saveCreditTime({ coursePublishId, action: 'start' }).catch(() => {});
    return () => {
      void saveCreditTime({ coursePublishId, action: 'stop' }).catch(() => {});
    };
  }, [coursePublishId, saveCreditTime]);

  const allModules = useMemo(() => flattenModules(hierarchy), [hierarchy]);
  const isCourseCompleted = useMemo(() => {
    if (!allModules.length) return false;
    return allModules.every((m) => m.status === 'completed');
  }, [allModules]);

  useEffect(() => {
    if (activeContentId != null) return;
    const preferredId = currentModule?.contentId ?? allModules[0]?.contentId ?? null;
    dispatch(setActiveContentId(preferredId));
  }, [activeContentId, allModules, currentModule?.contentId, dispatch]);

  const activeModule = useMemo(() => {
    if (!activeContentId) return null;
    return allModules.find((m) => m.contentId === activeContentId) ?? null;
  }, [activeContentId, allModules]);

  const activeIndex = useMemo(() => {
    if (!activeModule) return -1;
    return allModules.findIndex((m) => m.contentId === activeModule.contentId);
  }, [activeModule, allModules]);

  const prevModule = activeIndex > 0 ? allModules[activeIndex - 1] : null;
  const nextModule =
    activeIndex >= 0 && activeIndex < allModules.length - 1 ? allModules[activeIndex + 1] : null;

  if (!Number.isFinite(coursePublishId)) {
    return (
      <ScreenLayout scrollable={false}>
        <EmptyState title="Invalid course" message="Course id is missing or invalid." />
      </ScreenLayout>
    );
  }

  if ((isCourseLoading && !currentCourse) || (isHierarchyLoading && !hierarchy)) {
    return <LoadingScreen label="Loading course player..." />;
  }

  if ((courseError && !currentCourse) || (hierarchyError && !hierarchy)) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Course unavailable"
          message="We couldn't load this course right now."
          onRetry={() => {
            void dispatch(fetchCourseDetails({ course_publish_id: coursePublishId }));
            void refetchHierarchy();
          }}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={{ gap: 16, position: 'relative' }}>
        <Card variant="elevated" padding="lg">
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
              {currentCourse?.course_name ?? 'Course'}
            </Text>
            {activeModule ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Now playing: {activeModule.title}
              </Text>
            ) : null}
          </View>
        </Card>

        {activeModule ? (
          <PlayerContainer coursePublishId={coursePublishId} module={activeModule} />
        ) : (
          <Card variant="elevated" padding="lg">
            <EmptyState
              title="No playable module"
              message="This course does not currently contain any published content."
            />
          </Card>
        )}

        <Card variant="elevated" padding="lg">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Button
              title="Previous"
              variant="outline"
              disabled={!prevModule}
              onPress={() => dispatch(setActiveContentId(prevModule?.contentId ?? null))}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                {activeModule?.title ?? '—'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {activeIndex >= 0 ? `Module ${activeIndex + 1} of ${allModules.length}` : ''}
              </Text>
            </View>
            <Button
              title="Next"
              disabled={!nextModule}
              onPress={() => dispatch(setActiveContentId(nextModule?.contentId ?? null))}
            />
          </View>
        </Card>

        <Card variant="elevated" padding="lg">
          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 8 }}>
            Details / Notes / Ask Trainer / Discourse
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            Tabs are now available (notes/chat require curriculumId wiring).
          </Text>
        </Card>

        <PlayerTabs
          courseDetails={currentCourse}
          memberId={memberId}
          coursePublishId={coursePublishId}
          contentId={activeModule?.contentId}
        />

        {hierarchy ? (
          <CourseContentSidebar
            chapters={hierarchy.chapters}
            activeContentId={activeContentId}
            onSelectModule={(m) => dispatch(setActiveContentId(m.contentId))}
          />
        ) : null}

        <StudyBuddyChatbot
          storageKey={`studybuddy:${coursePublishId}:${activeModule?.contentId ?? 'none'}`}
          context={{
            coursePublishId,
            contentId: activeModule?.contentId,
            chapterId: activeModule?.chapterId,
            moduleType: activeModule?.type,
          }}
        />

        <CourseRating coursePublishId={coursePublishId} shouldPrompt={isCourseCompleted} />
        <CertificateViewer coursePublishId={coursePublishId} enabled={isCourseCompleted} />
      </View>
    </ScreenLayout>
  );
}
