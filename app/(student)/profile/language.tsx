import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

import { Button, EmptyState, ErrorState, LoadingScreen } from '@/components';
import { ScreenLayout } from '@/layouts';
import { useAppDispatch, useAppSelector } from '@/redux';
import { setSessionUser } from '@/redux/slices/authSlice';
import { setUserProfile } from '@/redux/slices/userSlice';
import {
  fetchLanguages,
  updateActiveLanguage,
} from '@/services/profile';
import type { LanguageOption } from '@/types/user.types';
import { useTheme } from '@/theme';

export default function LanguageScreen() {
  const dispatch = useAppDispatch();
  const { colors, fontFamily } = useTheme();
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.user.profile);

  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [selectedId, setSelectedId] = useState<number | undefined>(
    profile?.active_language_id ?? authUser?.active_language_id,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberId = profile?.member_id ?? authUser?.member_id;

  const load = useCallback(async () => {
    if (!memberId) {
      setError('Member session is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchLanguages(memberId);
      setLanguages(rows);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load languages.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const currentId = profile?.active_language_id ?? authUser?.active_language_id;
  const canSave =
    !!selectedId && selectedId !== currentId && !isSaving && languages.length > 0;

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      const languageId = await updateActiveLanguage(selectedId);

      if (profile) {
        dispatch(setUserProfile({ ...profile, active_language_id: languageId }));
      }
      if (authUser) {
        dispatch(
          setSessionUser({
            ...authUser,
            active_language_id: languageId,
          }),
        );
      }

      Toast.show({
        type: 'success',
        text1: 'Language updated',
        text2: 'Your preferred language has been saved.',
      });
    } catch (saveError) {
      Toast.show({
        type: 'error',
        text1: 'Update failed',
        text2:
          saveError instanceof Error
            ? saveError.message
            : 'Unable to update language.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen label="Loading languages..." />;
  }

  if (error) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState title="Languages unavailable" message={error} onRetry={load} />
      </ScreenLayout>
    );
  }

  if (languages.length === 0) {
    return (
      <ScreenLayout scrollable={false}>
        <EmptyState
          title="No languages available"
          message="Your organization has not configured language options yet."
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={{ gap: 16, paddingTop: 8 }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            lineHeight: 20,
            fontFamily: fontFamily.regular,
          }}
        >
          Select the language used for labels and content where supported.
        </Text>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          {languages.map((language, index) => {
            const selected = selectedId === language.language_id;
            return (
              <Pressable
                key={language.language_id}
                onPress={() => setSelectedId(language.language_id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  minHeight: 52,
                  borderBottomWidth: index === languages.length - 1 ? 0 : 1,
                  borderBottomColor: colors.divider,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontFamily: fontFamily.medium,
                  }}
                >
                  {language.name}
                </Text>
                <Ionicons
                  name={selected ? 'radio-button-on' : 'radio-button-off'}
                  size={22}
                  color={selected ? colors.primary : colors.textTertiary}
                />
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Update Language"
          onPress={handleSave}
          loading={isSaving}
          disabled={!canSave}
          fullWidth
        />
      </View>
    </ScreenLayout>
  );
}
