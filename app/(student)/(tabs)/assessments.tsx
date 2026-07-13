import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  EmptyState,
  ErrorState,
  SkeletonCard,
} from '../../../src/components';
import AssessmentListItem from '../../../src/components/assessments/AssessmentListItem';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { fetchAssessments } from '../../../src/redux/slices/assessmentSlice';
import { useTheme } from '../../../src/theme';
import type { Assessment, AssessmentStatus } from '../../../src/types/assessment.types';

type AssessmentFilter = 'all' | AssessmentStatus;
type SortKey = 'name' | 'due_asc' | 'due_desc' | 'start_asc';

const FILTER_OPTIONS: Array<{ key: AssessmentFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Yet to Start' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Attended' },
  { key: 'expired', label: 'Closed' },
];

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name A–Z',
  due_asc: 'Due Date ↑',
  due_desc: 'Due Date ↓',
  start_asc: 'Start Date',
};

function sortAssessments(items: Assessment[], sort: SortKey): Assessment[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sort === 'name') {
      return (a.test_name ?? '').localeCompare(b.test_name ?? '');
    }
    if (sort === 'due_asc' || sort === 'due_desc') {
      const aDue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      return sort === 'due_asc' ? aDue - bDue : bDue - aDue;
    }
    const aStart = a.start_date ? new Date(a.start_date).getTime() : 0;
    const bStart = b.start_date ? new Date(b.start_date).getTime() : 0;
    return aStart - bStart;
  });
  return copy;
}

export default function AssessmentsScreen() {
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { assessments, isLoading, error } = useAppSelector((state) => state.assessment);
  const [activeFilter, setActiveFilter] = useState<AssessmentFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('due_asc');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAssessments = useCallback(async () => {
    await dispatch(fetchAssessments()).unwrap();
  }, [dispatch]);

  useEffect(() => {
    void loadAssessments();
  }, [loadAssessments]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadAssessments();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadAssessments]);

  const filteredAssessments = useMemo(() => {
    const filtered = assessments.filter((assessment) =>
      activeFilter === 'all' ? true : assessment.status === activeFilter,
    );
    return sortAssessments(filtered, sortKey);
  }, [activeFilter, assessments, sortKey]);

  const openSortSheet = useCallback(() => {
    const options = [...Object.values(SORT_LABELS), 'Cancel'];
    const keys = Object.keys(SORT_LABELS) as SortKey[];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1 },
        (index) => {
          if (index >= 0 && index < keys.length) setSortKey(keys[index]!);
        },
      );
      return;
    }

    Alert.alert(
      'Sort by',
      undefined,
      [
        ...keys.map((key) => ({
          text: SORT_LABELS[key],
          onPress: () => setSortKey(key),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  }, []);

  const resolvePublishId = (assessment: Assessment) =>
    assessment.publish_id ?? assessment.assessment_id ?? assessment.test_id;

  return (
    <ScreenLayout
      floatingTabBar
      refreshing={isRefreshing}
      onRefresh={onRefresh}
    >
      <TabLayout
        title="Assessments"
        subtitle="Review upcoming tests, continue in-progress attempts, and revisit completed results."
      >
        <View style={{ gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {FILTER_OPTIONS.map((filter) => {
              const active = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : 'transparent',
                  }}
                >
                  <Animated.Text
                    entering={FadeInDown.springify().delay(20)}
                    style={{
                      color: active ? colors.onPrimary : colors.text,
                      fontSize: 13,
                      fontWeight: '700',
                    }}
                  >
                    {filter.label}
                  </Animated.Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={openSortSheet}
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Animated.Text entering={FadeInDown.springify().delay(40)} style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
              Sort: {SORT_LABELS[sortKey]}
            </Animated.Text>
          </Pressable>
        </View>

        {error && !assessments.length && !isLoading ? (
          <ErrorState
            title="Assessments unavailable"
            message={error}
            onRetry={() => {
              void loadAssessments();
            }}
          />
        ) : null}

        {isLoading && !assessments.length ? (
          <View style={{ gap: 16 }}>
            {[0, 1, 2].map((item) => (
              <SkeletonCard key={item} />
            ))}
          </View>
        ) : filteredAssessments.length === 0 ? (
          <EmptyState
            title="No assessments found"
            message="New assessments will appear here once they are assigned to you."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {filteredAssessments.map((assessment, index) => {
              const publishId = resolvePublishId(assessment);
              const canOpen = Number.isFinite(publishId) && publishId > 0;

              const openAttempt = canOpen
                ? () =>
                    router.push({
                      pathname: '/(student)/assessment/[id]',
                      params: { id: String(publishId) },
                    })
                : undefined;

              const openResults = canOpen
                ? () =>
                    router.push({
                      pathname: '/(student)/assessment/[id]',
                      params: { id: String(publishId), mode: 'results' },
                    })
                : undefined;

              return (
                <Animated.View
                  key={`${publishId}-${assessment.test_id}-${index}`}
                  entering={FadeInDown.springify().damping(20).delay(index * 30)}
                >
                  <AssessmentListItem
                    assessment={assessment}
                    variant="list"
                    onStartOrContinue={openAttempt}
                    onOpenResults={openResults}
                  />
                </Animated.View>
              );
            })}
          </View>
        )}
      </TabLayout>
    </ScreenLayout>
  );
}
