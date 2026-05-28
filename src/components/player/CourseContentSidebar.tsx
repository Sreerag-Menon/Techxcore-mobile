import { useMemo, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetSectionList,
} from '@gorhom/bottom-sheet';

import type { CourseChapter, CourseModule } from '../../types/course.types';
import { useTheme } from '../../theme';

export type CourseContentSidebarProps = {
  chapters: CourseChapter[];
  activeContentId: number | null;
  onSelectModule: (module: CourseModule) => void;
};

export function CourseContentSidebar({
  chapters,
  activeContentId,
  onSelectModule,
}: CourseContentSidebarProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['35%', '70%'], []);

  const sections = useMemo(
    () =>
      chapters.map((chapter) => ({
        title: chapter.title,
        data: chapter.modules,
      })),
    [chapters],
  );

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
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

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetSectionList
          sections={sections}
          keyExtractor={(item) => String(item.contentId)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 28 }}
          renderSectionHeader={({ section }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            const isActive = item.contentId === activeContentId;
            const flatModules = sections.flatMap((s) => s.data);
            const flatIndex = flatModules.findIndex((m) => m.contentId === item.contentId);
            const prev = flatIndex > 0 ? flatModules[flatIndex - 1] : null;
            const isLocked =
              Boolean(item.sequential) && prev != null && prev.status !== 'completed';

            return (
              <Pressable
                onPress={() => {
                  if (isLocked) return;
                  onSelectModule(item);
                  sheetRef.current?.dismiss();
                }}
                style={{
                  marginHorizontal: 16,
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
                      {isLocked ? ' · LOCKED' : ''}
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
      </BottomSheetModal>
    </>
  );
}

