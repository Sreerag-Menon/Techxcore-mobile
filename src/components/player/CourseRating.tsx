import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import { createMMKV } from 'react-native-mmkv';

import { useTheme } from '../../theme';
import { useSubmitCourseRatingMutation } from '../../redux/api/playerApi';

const storage = createMMKV();

export type CourseRatingProps = {
  coursePublishId: number;
  shouldPrompt?: boolean;
};

export function CourseRating({ coursePublishId, shouldPrompt }: CourseRatingProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%'], []);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [submit, submitState] = useSubmitCourseRatingMutation();

  useEffect(() => {
    if (!shouldPrompt) return;
    const key = `rating:prompted:${coursePublishId}`;
    if (storage.getBoolean(key)) return;
    storage.set(key, true);
    sheetRef.current?.present();
  }, [coursePublishId, shouldPrompt]);

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
        style={{
          position: 'absolute',
          right: 18,
          bottom: 74,
          backgroundColor: colors.warning,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        <Text style={{ color: colors.text, fontWeight: '900' }}>Rate</Text>
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
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>
            Rate this course
          </Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, idx) => {
              const value = idx + 1;
              const active = rating >= value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setRating(value)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? colors.primary : colors.background,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '900' }}>
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Optional comment…"
            placeholderTextColor={colors.textSecondary}
            style={{
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.text,
              backgroundColor: colors.background,
            }}
          />

          <Pressable
            onPress={() => {
              if (!rating) return;
              void submit({ coursePublishId, rating, comment: comment.trim() || undefined }).then(
                () => sheetRef.current?.dismiss(),
              );
            }}
            disabled={submitState.isLoading || rating === 0}
            style={{
              backgroundColor: rating === 0 ? colors.border : colors.primary,
              borderRadius: 14,
              paddingVertical: 12,
              alignItems: 'center',
              opacity: submitState.isLoading ? 0.7 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '900' }}>
              {submitState.isLoading ? 'Submitting…' : 'Submit'}
            </Text>
          </Pressable>
        </View>
      </BottomSheetModal>
    </>
  );
}

