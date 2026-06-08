import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../theme';
import { asyncStorage } from '../../utils/storage';
import { useSubmitCourseRatingMutation } from '../../redux/api/playerApi';
import {
  GlassBottomSheetModal,
  type GlassBottomSheetModalHandle,
} from '../ui/GlassBottomSheetModal';

export type CourseRatingHandle = {
  open: () => void;
};

export type CourseRatingProps = {
  coursePublishId: number;
  shouldPrompt?: boolean;
  showFloatingButton?: boolean;
};

export const CourseRating = forwardRef<CourseRatingHandle, CourseRatingProps>(
  function CourseRating({ coursePublishId, shouldPrompt, showFloatingButton = true }, ref) {
    const { colors } = useTheme();
    const sheetRef = useRef<GlassBottomSheetModalHandle>(null);
    const snapPoints = useMemo(() => ['40%'], []);
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const [submit, submitState] = useSubmitCourseRatingMutation();

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.open(),
    }));

    useEffect(() => {
      if (!shouldPrompt) return;
      const key = `rating:prompted:${coursePublishId}`;

      void (async () => {
        const prompted = await asyncStorage.getItem<boolean>(key);
        if (prompted) return;
        await asyncStorage.setItem(key, true);
        sheetRef.current?.open();
      })();
    }, [coursePublishId, shouldPrompt]);

    return (
      <>
        {showFloatingButton ? (
          <Pressable
            onPress={() => sheetRef.current?.open()}
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
        ) : null}

        <GlassBottomSheetModal ref={sheetRef} snapPoints={snapPoints}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>
              Rate this course
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setRating(value)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: rating >= value ? colors.warning : colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: rating >= value ? colors.text : colors.textSecondary }}>
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Optional comment…"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={{
                minHeight: 90,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 12,
                color: colors.text,
                backgroundColor: colors.background,
              }}
            />

            <Pressable
              onPress={() => {
                if (!rating) return;
                void submit({
                  coursePublishId,
                  rating,
                  comment: comment.trim() || undefined,
                }).then(() => sheetRef.current?.close());
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
        </GlassBottomSheetModal>
      </>
    );
  },
);
