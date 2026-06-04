import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, EmptyState, ErrorState, LoadingScreen } from '../../../src/components';
import { ScreenLayout } from '../../../src/layouts';
import { asNumber, extractItem } from '../../../src/api/normalize';
import { resolveCoursePlayerContext } from '../../../src/services/coursePlayerContext';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchCourseDetails } from '../../../src/redux/slices/courseSlice';
import { setActiveContentId } from '../../../src/redux/slices/playerSlice';
import {
  useGetCourseHierarchyQuery,
  useGetCurrentModuleQuery,
  useRecordPointsMutation,
  useSaveCreditTimeMutation,
} from '../../../src/redux/api/playerApi';
import { needsManualModuleCompletion } from '../../../src/utils/moduleCompletion';
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
  const { id, courseId: routeCourseId, curriculumId: routeCurriculumId } =
    useLocalSearchParams<{
      id: string;
      courseId?: string;
      curriculumId?: string;
    }>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();

  const courses = useAppSelector((state) => state.course.courses);
  const {
    currentCourse,
    isLoadingCourseDetails,
    error: courseError,
  } = useAppSelector((state) => state.course);
  const activeContentId = useAppSelector((state) => state.player.activeContentId);
  const memberId = useAppSelector((state) => state.user.profile?.member_id);
  const authMemberId = useAppSelector((state) => state.auth.user?.member_id);
  const authUser = useAppSelector((state) => state.auth.user);
  const studentName = useMemo(() => {
    const first = authUser?.first_name ?? '';
    const last = authUser?.last_name ?? '';
    const full = `${first} ${last}`.trim();
    return full.length > 0 ? full : undefined;
  }, [authUser]);

  const playerContext = useMemo(
    () =>
      resolveCoursePlayerContext(
        { id, courseId: routeCourseId, curriculumId: routeCurriculumId },
        courses,
      ),
    [id, routeCourseId, routeCurriculumId, courses],
  );

  const publishId = playerContext?.coursePublishId;
  const ctxCourseId = playerContext?.courseId;
  const ctxCurriculumId = playerContext?.curriculumId;

  const canLoadPlayer =
    publishId != null &&
    ctxCourseId != null &&
    ctxCurriculumId != null &&
    Number.isFinite(publishId) &&
    Number.isFinite(ctxCourseId) &&
    Number.isFinite(ctxCurriculumId);

  const {
    data: hierarchy,
    isLoading: isHierarchyLoading,
    error: hierarchyError,
    refetch: refetchHierarchy,
  } = useGetCourseHierarchyQuery(
    { coursePublishId: publishId!, courseId: ctxCourseId! },
    { skip: !canLoadPlayer },
  );

  const { data: currentModule } = useGetCurrentModuleQuery(
    {
      coursePublishId: publishId!,
      courseId: ctxCourseId!,
      curriculumId: ctxCurriculumId!,
    },
    { skip: !canLoadPlayer },
  );

  const [saveCreditTime] = useSaveCreditTimeMutation();
  const [recordPoints, { isLoading: isRecordingPoints }] = useRecordPointsMutation();
  const creditHourIdRef = useRef(0);
  const completionInFlightRef = useRef(false);
  const [sectionReady, setSectionReady] = useState(false);

  const studentId = memberId ?? authMemberId;

  useEffect(() => {
    dispatch(setActiveContentId(null));
  }, [publishId, dispatch]);

  useEffect(() => {
    if (publishId == null) return;
    void dispatch(fetchCourseDetails({ course_publish_id: publishId }));
  }, [publishId, dispatch]);

  useEffect(() => {
    if (publishId == null || ctxCourseId == null || !studentId) return;

    let cancelled = false;
    creditHourIdRef.current = 0;

    void saveCreditTime({
      coursePublishId: publishId,
      courseId: ctxCourseId,
      studentId,
      startCourse: 1,
    })
      .unwrap()
      .then((result) => {
        if (cancelled) return;
        const row = extractItem<Record<string, unknown>>(result);
        const hourId = asNumber(row?.hour_id ?? row?.hourId, 0);
        if (hourId > 0) creditHourIdRef.current = hourId;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      void saveCreditTime({
        coursePublishId: publishId,
        courseId: ctxCourseId,
        studentId,
        hourId: creditHourIdRef.current,
        stopCourse: 1,
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session tied to course + student only
  }, [publishId, ctxCourseId, studentId]);

  const allModules = useMemo(() => flattenModules(hierarchy), [hierarchy]);
  const isCourseCompleted = useMemo(() => {
    if (!allModules.length) return false;
    return allModules.every((m) => m.status === 'completed');
  }, [allModules]);

  const preferredContentId =
    hierarchy?.currentModuleId ?? currentModule?.contentId ?? allModules[0]?.contentId ?? null;

  useEffect(() => {
    if (activeContentId != null) return;
    dispatch(setActiveContentId(preferredContentId));
  }, [activeContentId, preferredContentId, dispatch]);

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

  useEffect(() => {
    setSectionReady(false);
    completionInFlightRef.current = false;
  }, [activeModule?.contentId]);

  const showMarkComplete = useMemo(() => {
    if (!activeModule) return false;
    if (activeModule.status === 'completed') return false;
    if (!needsManualModuleCompletion(activeModule)) return false;
    return sectionReady;
  }, [activeModule, sectionReady]);

  const handleMarkComplete = useCallback(() => {
    if (
      !activeModule ||
      !publishId ||
      ctxCourseId == null ||
      ctxCurriculumId == null ||
      !studentId ||
      activeModule.status === 'completed' ||
      completionInFlightRef.current ||
      isRecordingPoints
    ) {
      return;
    }

    completionInFlightRef.current = true;
    void recordPoints({
      coursePublishId: publishId,
      courseId: ctxCourseId,
      curriculumId: ctxCurriculumId,
      memberId: studentId,
      contentId: activeModule.contentId,
      chapterId: activeModule.chapterId,
      videoUnitId: activeModule.contentId,
      acadYearId: authUser?.acad_year_id,
    })
      .unwrap()
      .then(() => {
        void refetchHierarchy();
      })
      .catch(() => {})
      .finally(() => {
        completionInFlightRef.current = false;
      });
  }, [
    activeModule,
    authUser?.acad_year_id,
    ctxCourseId,
    ctxCurriculumId,
    isRecordingPoints,
    publishId,
    recordPoints,
    refetchHierarchy,
    studentId,
  ]);

  if (!playerContext) {
    return (
      <ScreenLayout scrollable={false}>
        <EmptyState
          title="Invalid course"
          message="Course context is missing. Open the course from the Courses list."
        />
      </ScreenLayout>
    );
  }

  if ((isLoadingCourseDetails && !currentCourse) || (isHierarchyLoading && !hierarchy)) {
    return <LoadingScreen label="Loading course player..." />;
  }

  if ((courseError && !currentCourse) || (hierarchyError && !hierarchy)) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Course unavailable"
          message="We couldn't load this course right now."
          onRetry={() => {
            void dispatch(fetchCourseDetails({ course_publish_id: playerContext.coursePublishId }));
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
          <PlayerContainer
            coursePublishId={playerContext.coursePublishId}
            courseId={playerContext.courseId}
            curriculumId={playerContext.curriculumId}
            memberId={studentId ?? undefined}
            acadYearId={authUser?.acad_year_id}
            module={activeModule}
            onSectionReady={() => setSectionReady(true)}
          />
        ) : (
          <Card variant="elevated" padding="lg">
            <EmptyState
              title="No playable module"
              message="This course does not currently contain any published content."
            />
          </Card>
        )}

        {showMarkComplete ? (
          <Card variant="elevated" padding="md">
            <Button
              title={isRecordingPoints ? 'Saving…' : 'Mark as complete'}
              disabled={isRecordingPoints}
              onPress={handleMarkComplete}
            />
          </Card>
        ) : null}

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

        <PlayerTabs
          courseDetails={currentCourse}
          memberId={memberId}
          coursePublishId={playerContext.coursePublishId}
          contentId={activeModule?.contentId}
          curriculumId={playerContext.curriculumId}
          topicId={hierarchy?.topicId}
          studentName={studentName}
        />

        {hierarchy ? (
          <CourseContentSidebar
            chapters={hierarchy.chapters}
            activeContentId={activeContentId}
            onSelectModule={(m) => dispatch(setActiveContentId(m.contentId))}
          />
        ) : null}

        <StudyBuddyChatbot
          storageKey={
            activeModule?.contentId != null && Number.isFinite(activeModule.contentId)
              ? `studybuddy:${playerContext.coursePublishId}:${activeModule.contentId}`
              : `studybuddy:${playerContext.coursePublishId}:none`
          }
          context={{
            coursePublishId: playerContext.coursePublishId,
            contentId: activeModule?.contentId,
            chapterId: activeModule?.chapterId,
            moduleType: activeModule?.type,
          }}
        />

        <CourseRating coursePublishId={playerContext.coursePublishId} shouldPrompt={isCourseCompleted} />
        <CertificateViewer coursePublishId={playerContext.coursePublishId} enabled={isCourseCompleted} />
      </View>
    </ScreenLayout>
  );
}
