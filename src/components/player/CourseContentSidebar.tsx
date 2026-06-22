import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetSectionList } from '@gorhom/bottom-sheet';

import type { CourseChapter, CourseModule } from '../../types/course.types';
import { getModuleLockState } from '../../utils/moduleAccess';
import { useTheme } from '../../theme';
import {
  GlassBottomSheetModal,
  type GlassBottomSheetModalHandle,
} from '../ui/GlassBottomSheetModal';

export type CourseContentSidebarHandle = {
  open: () => void;
};

export type CourseContentSidebarProps = {
  chapters: CourseChapter[];
  activeContentId: number | null;
  onSelectModule: (module: CourseModule) => void;
  /** Course publish setting: enforce sequential module order. */
  courseSequential?: boolean;
  /** When false, only the bottom sheet is rendered (no floating FAB). */
  showFloatingButton?: boolean;
};

export const CourseContentSidebar = forwardRef<
  CourseContentSidebarHandle,
  CourseContentSidebarProps
>(function CourseContentSidebar(
  { chapters, activeContentId, onSelectModule, courseSequential = false, showFloatingButton = true },
  ref,
) {
  const { colors } = useTheme();
  const sheetRef = useRef<GlassBottomSheetModalHandle>(null);
  const snapPoints = useMemo(() => ['35%', '70%'], []);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.open(),
  }));

  const sections = useMemo(
    () =>
      chapters.map((chapter) => ({
        title: chapter.title,
        data: chapter.modules,
      })),
    [chapters],
  );

  const flatModules = useMemo(() => sections.flatMap((s) => s.data), [sections]);

  return (
    <>
      {showFloatingButton ? (
        <Pressable
          onPress={() => sheetRef.current?.open()}
          style={{
            position: 'absolute',
            right: 18,
            bottom: 18,
            backgroundColor: colors.primary,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 12,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>Contents</Text>
        </Pressable>
      ) : null}

      <GlassBottomSheetModal ref={sheetRef} snapPoints={snapPoints}>
        <BottomSheetSectionList
          sections={sections}
          keyExtractor={(item) => String(item.contentId)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 28 }}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            const isActive = item.contentId === activeContentId;
            const { isLocked, reason: lockReason } = getModuleLockState(
              item,
              flatModules,
              courseSequential,
            );
            const isDripLocked = lockReason === 'drip';

            return (
              <Pressable
                onPress={() => {
                  if (isLocked) return;
                  onSelectModule(item);
                  sheetRef.current?.close();
                }}
                style={{
                  marginHorizontal: 20,
                  marginBottom: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  backgroundColor: isActive ? colors.primaryLight : colors.background,
                  padding: 14,
                  opacity: isLocked ? 0.55 : 1,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: isActive ? '800' : '600',
                      }}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {item.type.toUpperCase()}
                      {item.status ? ` · ${item.status.replace('_', ' ')}` : ''}
                      {isDripLocked && item.scheduledOn
                        ? ` · Available ${item.scheduledOn}`
                        : isLocked
                          ? ' · LOCKED'
                          : ''}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {index + 1}/{section.data.length}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      </GlassBottomSheetModal>
    </>
  );
});
