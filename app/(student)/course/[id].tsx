import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingScreen,
  ProgressBar,
} from '../../../src/components';
import { ScreenLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchCourseDetails } from '../../../src/redux/slices/courseSlice';
import { useTheme } from '../../../src/theme';

function getContentLabel(type?: string) {
  return (type ?? 'content').slice(0, 3).toUpperCase();
}

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { currentCourse, isLoading, error } = useAppSelector((state) => state.course);
  const [selectedContentId, setSelectedContentId] = useState<number | null>(null);
  const [completedContentIds, setCompletedContentIds] = useState<number[]>([]);

  const loadCourse = useCallback(async () => {
    const courseId = Number(id);
    if (!Number.isFinite(courseId)) return;

    const course = await dispatch(
      fetchCourseDetails({ course_publish_id: courseId }),
    ).unwrap();

    setSelectedContentId(course.contents[0]?.content_id ?? null);
    setCompletedContentIds(
      course.contents.filter((content) => content.is_completed).map((content) => content.content_id),
    );
  }, [dispatch, id]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  const selectedContent = useMemo(
    () =>
      currentCourse?.contents.find(
        (content) => content.content_id === selectedContentId,
      ) ?? currentCourse?.contents[0],
    [currentCourse?.contents, selectedContentId],
  );

  const progress = useMemo(() => {
    if (!currentCourse?.contents.length) return 0;

    return Math.round(
      (completedContentIds.length / currentCourse.contents.length) * 100,
    );
  }, [completedContentIds.length, currentCourse?.contents.length]);

  const toggleCompletion = () => {
    if (!selectedContent) return;

    setCompletedContentIds((currentIds) => {
      const hasCompleted = currentIds.includes(selectedContent.content_id);
      const nextIds = hasCompleted
        ? currentIds.filter((value) => value !== selectedContent.content_id)
        : [...currentIds, selectedContent.content_id];

      Toast.show({
        type: 'success',
        text1: hasCompleted ? 'Marked incomplete' : 'Marked complete',
        text2: `${selectedContent.content_name} updated in your local progress view.`,
      });

      return nextIds;
    });
  };

  if (isLoading && !currentCourse) {
    return <LoadingScreen label="Loading course details..." />;
  }

  if (error && !currentCourse) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Course unavailable"
          message={error}
          onRetry={() => {
            void loadCourse();
          }}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      {currentCourse ? (
        <View style={{ gap: 16 }}>
          <Card variant="elevated" padding="lg">
            <View style={{ gap: 14 }}>
              <Badge label="Course" variant="primary" />
              <Text
                style={{
                  color: colors.text,
                  fontSize: 24,
                  fontWeight: '700',
                }}
              >
                {currentCourse.course_name}
              </Text>
              {currentCourse.course_description ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 14,
                    lineHeight: 22,
                  }}
                >
                  {currentCourse.course_description}
                </Text>
              ) : null}
              <ProgressBar progress={progress} showLabel />
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {currentCourse.contents.length} learning items
                </Text>
                {currentCourse.total_duration ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {currentCourse.total_duration}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>

          <Card variant="elevated" padding="lg">
            <View style={{ gap: 14 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: '700',
                }}
              >
                Current lesson
              </Text>

              {selectedContent ? (
                <>
                  <View
                    style={{
                      borderRadius: 16,
                      backgroundColor: colors.background,
                      padding: 18,
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 22,
                          backgroundColor: colors.primaryLight,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text
                          style={{
                            color: colors.primary,
                            fontSize: 12,
                            fontWeight: '700',
                            letterSpacing: 0.8,
                          }}
                        >
                          {getContentLabel(selectedContent.content_type)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 16,
                            fontWeight: '700',
                          }}
                        >
                          {selectedContent.content_name}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          {selectedContent.content_type.toUpperCase()}
                          {selectedContent.duration
                            ? ` · ${selectedContent.duration}`
                            : ''}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 13,
                        lineHeight: 20,
                      }}
                    >
                      Open this content in the LMS media experience or mark it as
                      completed once reviewed.
                    </Text>

                    <Button
                      title={
                        completedContentIds.includes(selectedContent.content_id)
                          ? 'Mark as Incomplete'
                          : 'Mark as Complete'
                      }
                      onPress={toggleCompletion}
                      fullWidth
                    />
                  </View>
                </>
              ) : (
                <EmptyState
                  title="No lesson selected"
                  message="This course does not currently contain any published content."
                />
              )}
            </View>
          </Card>

          <Card variant="elevated" padding="lg">
            <View style={{ gap: 14 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: '700',
                }}
              >
                Course Contents
              </Text>

              {!currentCourse.contents.length ? (
                <EmptyState
                  title="No content available"
                  message="Published modules will appear here once they are assigned."
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                >
                  {currentCourse.contents.map((content) => {
                    const isSelected = content.content_id === selectedContent?.content_id;
                    const isCompleted = completedContentIds.includes(content.content_id);

                    return (
                      <Card
                        key={content.content_id}
                        variant={isSelected ? 'elevated' : 'outlined'}
                        padding="md"
                        onPress={() => setSelectedContentId(content.content_id)}
                        style={{
                          width: 220,
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: isSelected ? undefined : colors.border,
                        }}
                      >
                        <View style={{ gap: 10 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text
                              style={{
                                color: colors.primary,
                                fontSize: 12,
                                fontWeight: '700',
                                letterSpacing: 0.8,
                              }}
                            >
                              {getContentLabel(content.content_type)}
                            </Text>
                            <Badge
                              label={isCompleted ? 'Done' : 'Pending'}
                              variant={isCompleted ? 'success' : 'neutral'}
                            />
                          </View>
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 15,
                              fontWeight: '600',
                            }}
                          >
                            {content.content_name}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                            {content.content_type.toUpperCase()}
                            {content.duration
                              ? ` · ${content.duration}`
                              : ''}
                          </Text>
                        </View>
                      </Card>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </Card>
        </View>
      ) : (
        <EmptyState
          title="Course not found"
          message="We could not load the selected course."
        />
      )}
    </ScreenLayout>
  );
}
