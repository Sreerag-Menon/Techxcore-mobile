import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

import {
  Button,
  EmptyState,
  ErrorState,
  LoadingScreen,
} from '@/components';
import { ScreenLayout } from '@/layouts';
import { useAppSelector } from '@/redux';
import {
  fetchMemberEssentialSkills,
  fetchSkillDetails,
  saveSkillDetails,
} from '@/services/profile';
import { useTheme } from '@/theme';

export default function SkillAssessmentScreen() {
  const { colors, fontFamily } = useTheme();
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.user.profile);

  const memberId = profile?.member_id ?? authUser?.member_id;
  const jobProfile = profile?.job_profile ?? authUser?.job_profile;

  const [available, setAvailable] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [exists, setExists] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!memberId) {
      setError('Member session is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [essentials, details] = await Promise.all([
        jobProfile
          ? fetchMemberEssentialSkills(jobProfile)
          : Promise.resolve([] as string[]),
        fetchSkillDetails(memberId),
      ]);

      setAvailable(essentials);
      setSelected(details.essential_skill);
      setExists(details.exists);
      setDirty(false);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load skill assessment.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobProfile, memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSkill = (skill: string) => {
    setDirty(true);
    setSelected((prev) =>
      prev.includes(skill)
        ? prev.filter((item) => item !== skill)
        : [...prev, skill],
    );
  };

  const canSave = dirty && selected.length > 0 && !isSaving;

  const handleSave = async () => {
    if (!memberId || !canSave) return;
    setIsSaving(true);
    try {
      await saveSkillDetails({
        memberId,
        essentialSkill: selected,
        action: exists ? 'Update' : 'add',
      });
      setExists(true);
      setDirty(false);
      Toast.show({ type: 'success', text1: 'Skill assessment saved' });
    } catch (saveError) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2:
          saveError instanceof Error
            ? saveError.message
            : 'Unable to save assessment.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingScreen label="Loading skill assessment..." />;

  if (error) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Assessment unavailable"
          message={error}
          onRetry={load}
        />
      </ScreenLayout>
    );
  }

  if (!jobProfile || available.length === 0) {
    return (
      <ScreenLayout scrollable={false}>
        <EmptyState
          title="No skills to assess"
          message="A job profile with essential skills is required before you can complete this assessment."
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
          Select the essential skills you have assessed for your job profile
          ({jobProfile}).
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
          {available.map((skill, index) => {
            const checked = selected.includes(skill);
            return (
              <Pressable
                key={skill}
                onPress={() => toggleSkill(skill)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: index === available.length - 1 ? 0 : 1,
                  borderBottomColor: colors.divider,
                }}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={checked ? colors.primary : colors.textTertiary}
                />
                <Text
                  style={{
                    flex: 1,
                    color: colors.text,
                    fontSize: 15,
                    fontFamily: fontFamily.regular,
                  }}
                >
                  {skill}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Save Assessment"
          onPress={handleSave}
          loading={isSaving}
          disabled={!canSave}
          fullWidth
        />
      </View>
    </ScreenLayout>
  );
}
