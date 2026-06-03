import { useCallback, useEffect, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Linking, Pressable, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingScreen,
  ProgressBar,
} from '../../../src/components';
import { ScreenLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import {
  clearCreditDetails,
  fetchCourseDetails,
  fetchStudentCourseCreditDetails,
} from '../../../src/redux/slices/courseSlice';
import { useGetCertificateQuery } from '../../../src/redux/api/playerApi';
import { resolveCoursePlayerContext } from '../../../src/services/coursePlayerContext';
import { navigateToCourse } from '../../../src/services/courseNavigation';
import { useTheme } from '../../../src/theme';

export default function CourseDetailsScreen() {
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
    creditDetails,
    isLoadingCourseDetails,
    isLoadingCreditDetails,
    error,
  } = useAppSelector((state) => state.course);
  const memberId = useAppSelector(
    (state) => state.user.profile?.member_id ?? state.auth.user?.member_id,
  );

  const playerContext = useMemo(
    () =>
      resolveCoursePlayerContext(
        { id, courseId: routeCourseId, curriculumId: routeCurriculumId },
        courses,
      ),
    [id, routeCourseId, routeCurriculumId, courses],
  );

  const courseFromList = useMemo(
    () =>
      courses.find(
        (c) => String(c.course_publish_id) === String(playerContext?.coursePublishId),
      ),
    [courses, playerContext?.coursePublishId],
  );

  const publishId = playerContext?.coursePublishId;

  useEffect(() => {
    if (publishId == null) return;
    void dispatch(fetchCourseDetails({ course_publish_id: publishId }));
    return () => {
      dispatch(clearCreditDetails());
    };
  }, [publishId, dispatch]);

  useEffect(() => {
    if (publishId == null || !memberId) return;
    void dispatch(
      fetchStudentCourseCreditDetails({
        coursePublishId: publishId,
        studentId: memberId,
      }),
    );
  }, [publishId, memberId, dispatch]);

  const certificateConfigId = courseFromList?.certificate_config_id;
  const progress =
    creditDetails?.progress_percentage ?? courseFromList?.progress_percentage ?? 0;
  const canFetchCertificate =
    (creditDetails?.course_credit ?? courseFromList?.credits ?? 0) >= 3 &&
    certificateConfigId != null &&
    certificateConfigId > 0;

  const { data: certificateData, isFetching: isCertificateLoading } = useGetCertificateQuery(
    {
      coursePublishId: publishId ?? 0,
      certificateConfigId,
      type: courseFromList?.certificate_assigned_type ?? 'Course',
    },
    { skip: !canFetchCertificate || publishId == null },
  );

  const onOpenCourse = useCallback(() => {
    if (!courseFromList) return;
    navigateToCourse(courseFromList);
  }, [courseFromList]);

  if (!playerContext) {
    return (
      <ScreenLayout>
        <EmptyState
          title="Course not found"
          message="Open this screen from the Courses list."
        />
      </ScreenLayout>
    );
  }

  if ((isLoadingCourseDetails && !currentCourse) || isLoadingCreditDetails) {
    return <LoadingScreen label="Loading course details..." />;
  }

  if (error && !currentCourse) {
    return (
      <ScreenLayout>
        <ErrorState
          title="Unable to load details"
          message={error}
          onRetry={() => {
            if (publishId == null) return;
            void dispatch(fetchCourseDetails({ course_publish_id: publishId }));
          }}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={{ gap: 16 }}>
        <Card variant="elevated" padding="lg">
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
              {currentCourse?.course_name ?? 'Course'}
            </Text>
            {currentCourse?.course_description ? (
              <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
                {currentCourse.course_description}
              </Text>
            ) : null}
            <ProgressBar progress={progress} showLabel />
            {creditDetails?.status ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Status: {creditDetails.status}
              </Text>
            ) : null}
          </View>
        </Card>

        <Card variant="elevated" padding="lg">
          <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 10 }}>
            Activity
          </Text>
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.textSecondary }}>
              Course credits: {creditDetails?.course_credit ?? courseFromList?.credits ?? 0}
            </Text>
            {creditDetails?.watch_time ? (
              <Text style={{ color: colors.textSecondary }}>
                Watch time: {creditDetails.watch_time}
              </Text>
            ) : null}
            {creditDetails?.activity ? (
              <Text style={{ color: colors.textSecondary }}>
                Activity: {creditDetails.activity}
              </Text>
            ) : null}
            {currentCourse?.instructor_name ? (
              <Text style={{ color: colors.textSecondary }}>
                Trainer: {currentCourse.instructor_name}
              </Text>
            ) : null}
          </View>
        </Card>

        {canFetchCertificate ? (
          <Card variant="elevated" padding="lg">
            <Text style={{ color: colors.text, fontWeight: '800', marginBottom: 8 }}>
              Certificate
            </Text>
            {isCertificateLoading ? (
              <Text style={{ color: colors.textSecondary }}>Loading certificate…</Text>
            ) : certificateData?.certificateUrl ? (
              <Pressable
                onPress={() => {
                  void Linking.openURL(certificateData.certificateUrl).catch(() => {});
                }}
              >
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  View certificate
                </Text>
              </Pressable>
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                Certificate is not available yet.
              </Text>
            )}
          </Card>
        ) : null}

        {courseFromList ? (
          <Button title="Continue learning" onPress={onOpenCourse} />
        ) : null}
      </View>
    </ScreenLayout>
  );
}
