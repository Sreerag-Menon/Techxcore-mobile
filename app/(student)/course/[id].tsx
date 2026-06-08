import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Button, EmptyState, ErrorState, LoadingScreen } from '../../../src/components';
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
  useSaveModuleProgressMutation,
} from '../../../src/redux/api/playerApi';
import {
  buildCompletionProgressArgs,
  buildRecordPointsArgs,
} from '../../../src/services/moduleCompletionFlow';
import { needsManualModuleCompletion } from '../../../src/utils/moduleCompletion';
import { clearModuleOpenSentForPublish } from '../../../src/utils/moduleProgressSession';
import { logProgressDiag } from '../../../src/utils/progressDiagnostics';
import { useTheme } from '../../../src/theme';
import type { CourseModule } from '../../../src/types/course.types';
import { PlayerContainer } from '../../../src/components/player/PlayerContainer';
import {
  CourseContentSidebar,
  type CourseContentSidebarHandle,
} from '../../../src/components/player/CourseContentSidebar';
import { PlayerTabs } from '../../../src/components/player/PlayerTabs';
import {
  StudyBuddyChatbot,
  type StudyBuddyChatbotHandle,
} from '../../../src/components/player/StudyBuddyChatbot';
import { CourseRating, type CourseRatingHandle } from '../../../src/components/player/CourseRating';
import {
  CertificateViewer,
  type CertificateViewerHandle,
} from '../../../src/components/player/CertificateViewer';
import { CoursePlayerBottomBar } from '../../../src/components/player/CoursePlayerBottomBar';

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

  const contentsRef = useRef<CourseContentSidebarHandle>(null);
  const studyBuddyRef = useRef<StudyBuddyChatbotHandle>(null);
  const ratingRef = useRef<CourseRatingHandle>(null);
  const certificateRef = useRef<CertificateViewerHandle>(null);

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
    { skip: !canLoadPlayer, refetchOnMountOrArgChange: true },
  );

  useFocusEffect(
    useCallback(() => {
      if (!canLoadPlayer) return;
      void refetchHierarchy();
      return () => {
        if (publishId != null) clearModuleOpenSentForPublish(publishId);
      };
    }, [canLoadPlayer, publishId, refetchHierarchy]),
  );

  const resolvedChapterId = useMemo(() => {
    if (activeContentId == null || !hierarchy) return undefined;
    for (const chapter of hierarchy.chapters) {
      if (chapter.modules.some((mod) => mod.contentId === activeContentId)) {
        return chapter.chapterId;
      }
    }
    return undefined;
  }, [activeContentId, hierarchy]);

  const { data: currentModule, refetch: refetchCurrentModule } = useGetCurrentModuleQuery(
    {
      coursePublishId: publishId!,
      courseId: ctxCourseId!,
      curriculumId: ctxCurriculumId!,
      ...(resolvedChapterId != null ? { chapterId: resolvedChapterId } : {}),
    },
    { skip: !canLoadPlayer },
  );

  const [saveCreditTime] = useSaveCreditTimeMutation();
  const [saveModuleProgress] = useSaveModuleProgressMutation();
  const [recordPoints, { isLoading: isRecordingPoints }] = useRecordPointsMutation();
  const creditHourIdRef = useRef(0);
  const completionInFlightRef = useRef(false);
  const [sectionReady, setSectionReady] = useState(false);

  const studentId = useMemo(() => {
    const id = asNumber(memberId ?? authMemberId, Number.NaN);
    return Number.isFinite(id) ? id : undefined;
  }, [memberId, authMemberId]);

  useEffect(() => {
    logProgressDiag('course:context', {
      route: { id, courseId: routeCourseId, curriculumId: routeCurriculumId },
      resolved: playerContext,
      canLoadPlayer,
      studentId,
      memberId,
      authMemberId,
      activeModuleId: activeContentId,
    });
  }, [
    activeContentId,
    authMemberId,
    canLoadPlayer,
    id,
    memberId,
    playerContext,
    routeCourseId,
    routeCurriculumId,
    studentId,
  ]);

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
  const completedModules = useMemo(
    () => allModules.filter((m) => m.status === 'completed').length,
    [allModules],
  );
  const courseProgressPercent = useMemo(() => {
    if (!allModules.length) return 0;
    return Math.round((completedModules / allModules.length) * 100);
  }, [allModules.length, completedModules]);
  const isCourseCompleted = useMemo(() => {
    if (!allModules.length) return false;
    return allModules.every((m) => m.status === 'completed');
  }, [allModules]);

  const completeActiveModule = useCallback(
    async (
      module: CourseModule,
      positions?: { lastViewedPos: number; maxViewedPos: number },
    ) => {
      const blockers: string[] = [];
      if (!publishId) blockers.push('missing_publishId');
      if (ctxCourseId == null) blockers.push('missing_courseId');
      if (ctxCurriculumId == null) blockers.push('missing_curriculumId');
      if (!studentId) blockers.push('missing_studentId');
      if (module.status === 'completed') blockers.push('already_completed');
      if (completionInFlightRef.current) blockers.push('completion_in_flight');

      if (blockers.length > 0) {
        logProgressDiag('completion:blocked', {
          blockers,
          moduleId: module.contentId,
          moduleType: module.type,
          moduleStatus: module.status,
          positions,
        });
        return;
      }

      completionInFlightRef.current = true;
      const ctx = {
        coursePublishId: publishId,
        courseId: ctxCourseId,
        curriculumId: ctxCurriculumId,
        memberId: studentId,
        acadYearId: authUser?.acad_year_id,
      };

      const progressArgs = buildCompletionProgressArgs(module, ctx, positions);
      const pointsArgs = buildRecordPointsArgs(module, ctx);

      logProgressDiag('completion:start', {
        progressArgs,
        pointsArgs,
        note: 'Step 1 = module_time (inProgress 0), Step 2 = trainee_points',
      });

      try {
        const progressResult = await saveModuleProgress(progressArgs).unwrap();
        logProgressDiag('completion:step1_done', { progressResult });

        const pointsResult = await recordPoints(pointsArgs).unwrap();
        logProgressDiag('completion:step2_done', { pointsResult });

        const hierResult = await refetchHierarchy();
        const currentResult = await refetchCurrentModule();
        logProgressDiag('completion:refetch_done', {
          hierarchyModuleCount: hierResult.data?.chapters.flatMap((c) => c.modules).length,
          completedCount: hierResult.data?.chapters
            .flatMap((c) => c.modules)
            .filter((m) => m.status === 'completed').length,
          currentModule: currentResult.data,
        });
      } catch (error) {
        logProgressDiag('completion:failed', { error, progressArgs, pointsArgs });
      } finally {
        completionInFlightRef.current = false;
      }
    },
    [
      authUser?.acad_year_id,
      ctxCourseId,
      ctxCurriculumId,
      publishId,
      recordPoints,
      refetchCurrentModule,
      refetchHierarchy,
      saveModuleProgress,
      studentId,
    ],
  );

  const handleModuleComplete = useCallback(
    (module: CourseModule, positions?: { lastViewedPos: number; maxViewedPos: number }) => {
      void completeActiveModule(module, positions);
    },
    [completeActiveModule],
  );

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
    if (!activeModule || isRecordingPoints) return;
    void completeActiveModule(activeModule);
  }, [activeModule, completeActiveModule, isRecordingPoints]);

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
    <ScreenLayout scrollable={false} contentContainerStyle={{ paddingBottom: 0 }}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }} numberOfLines={1}>
            {currentCourse?.course_name ?? 'Course'}
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 16, gap: 12 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeModule ? (
            <PlayerContainer
              coursePublishId={playerContext.coursePublishId}
              courseId={playerContext.courseId}
              curriculumId={playerContext.curriculumId}
              memberId={studentId ?? undefined}
              acadYearId={authUser?.acad_year_id}
              module={activeModule}
              seekable={hierarchy?.seekable !== false}
              onSectionReady={() => setSectionReady(true)}
              onModuleComplete={handleModuleComplete}
            />
          ) : (
            <EmptyState
              title="No playable module"
              message="This course does not currently contain any published content."
            />
          )}

          {allModules.length > 0 ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                  Course progress
                </Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                  {completedModules}/{allModules.length} · {courseProgressPercent}%
                </Text>
              </View>
              <View
                style={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: colors.border,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${courseProgressPercent}%`,
                    backgroundColor: colors.primary,
                    borderRadius: 999,
                  }}
                />
              </View>
            </View>
          ) : null}

          {showMarkComplete ? (
            <Button
              title={isRecordingPoints ? 'Saving…' : 'Mark as complete'}
              disabled={isRecordingPoints}
              onPress={handleMarkComplete}
            />
          ) : null}

          <PlayerTabs
            courseDetails={currentCourse}
            module={activeModule}
            memberId={memberId}
            coursePublishId={playerContext.coursePublishId}
            contentId={activeModule?.contentId}
            curriculumId={playerContext.curriculumId}
            topicId={hierarchy?.topicId}
            studentName={studentName}
          />
        </ScrollView>

        <CoursePlayerBottomBar
          activeIndex={activeIndex}
          totalModules={allModules.length}
          completedModules={completedModules}
          hasPrev={Boolean(prevModule)}
          hasNext={Boolean(nextModule)}
          onPrev={() => dispatch(setActiveContentId(prevModule?.contentId ?? null))}
          onNext={() => dispatch(setActiveContentId(nextModule?.contentId ?? null))}
          onOpenContents={() => contentsRef.current?.open()}
          onOpenStudyBuddy={() => studyBuddyRef.current?.open()}
          onOpenRate={() => ratingRef.current?.open()}
          onOpenCertificate={() => certificateRef.current?.open()}
          showRate={isCourseCompleted}
          showCertificate={isCourseCompleted}
        />
      </View>

      {hierarchy ? (
        <CourseContentSidebar
          ref={contentsRef}
          chapters={hierarchy.chapters}
          activeContentId={activeContentId}
          courseSequential={hierarchy.sequential === true}
          onSelectModule={(m) => dispatch(setActiveContentId(m.contentId))}
          showFloatingButton={false}
        />
      ) : null}

      <StudyBuddyChatbot
        ref={studyBuddyRef}
        showFloatingButton={false}
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

      <CourseRating
        ref={ratingRef}
        coursePublishId={playerContext.coursePublishId}
        shouldPrompt={isCourseCompleted}
        showFloatingButton={false}
      />

      <CertificateViewer
        ref={certificateRef}
        coursePublishId={playerContext.coursePublishId}
        enabled={isCourseCompleted}
        showFloatingButton={false}
      />
    </ScreenLayout>
  );
}
