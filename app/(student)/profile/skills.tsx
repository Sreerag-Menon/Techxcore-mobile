import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

import {
  Button,
  ErrorState,
  LoadingScreen,
} from '@/components';
import { ScreenLayout } from '@/layouts';
import { useAppSelector } from '@/redux';
import {
  fetchJobDetails,
  fetchJobSkillOptions,
  fetchMemberEssentialSkills,
  saveJobDetails,
} from '@/services/profile';
import type { SkillOption } from '@/types/user.types';
import { useTheme } from '@/theme';

const MAX_INTERESTS = 5;

export default function SkillsScreen() {
  const { colors, fontFamily } = useTheme();
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.user.profile);

  const memberId = profile?.member_id ?? authUser?.member_id;
  const jobProfile = profile?.job_profile ?? authUser?.job_profile;

  const [jobTitle, setJobTitle] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [exists, setExists] = useState(false);
  const [essentialSkills, setEssentialSkills] = useState<string[]>([]);
  const [options, setOptions] = useState<SkillOption[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!memberId) {
      setError('Member session is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [details, skillOptions, essentials] = await Promise.all([
        fetchJobDetails(memberId),
        fetchJobSkillOptions(),
        jobProfile
          ? fetchMemberEssentialSkills(jobProfile)
          : Promise.resolve([] as string[]),
      ]);

      setJobTitle(details.job_title);
      setInterests(details.job_interest);
      setExists(details.exists);
      setOptions(skillOptions);
      setEssentialSkills(essentials);
      setDirty(false);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : 'Unable to load skills.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobProfile, memberId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options
      .filter((option) => !interests.includes(option.value))
      .filter((option) => !q || option.label.toLowerCase().includes(q))
      .slice(0, 12);
  }, [interests, options, query]);

  const canSave =
    dirty &&
    jobTitle.trim().length > 0 &&
    interests.length > 0 &&
    interests.length <= MAX_INTERESTS &&
    !isSaving;

  const toggleInterest = (skill: string) => {
    setDirty(true);
    setInterests((prev) => {
      if (prev.includes(skill)) {
        return prev.filter((item) => item !== skill);
      }
      if (prev.length >= MAX_INTERESTS) {
        Toast.show({
          type: 'info',
          text1: 'Interest limit',
          text2: `You can select up to ${MAX_INTERESTS} interests.`,
        });
        return prev;
      }
      return [...prev, skill];
    });
  };

  const handleSave = async () => {
    if (!memberId || !canSave) return;
    setIsSaving(true);
    try {
      await saveJobDetails({
        memberId,
        jobTitle: jobTitle.trim(),
        interest: interests,
        action: exists ? 'Update' : 'add',
      });
      setExists(true);
      setDirty(false);
      Toast.show({ type: 'success', text1: 'Skills saved' });
    } catch (saveError) {
      Toast.show({
        type: 'error',
        text1: 'Save failed',
        text2:
          saveError instanceof Error ? saveError.message : 'Unable to save skills.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingScreen label="Loading skills..." />;

  if (error) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState title="Skills unavailable" message={error} onRetry={load} />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={{ gap: 20, paddingTop: 8 }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderCurve: 'continuous',
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            gap: 10,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              fontFamily: fontFamily.medium,
              textTransform: 'uppercase',
            }}
          >
            Job profile
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontFamily: fontFamily.bold,
            }}
          >
            {jobProfile || 'Not assigned'}
          </Text>
          {essentialSkills.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {essentialSkills.map((skill) => (
                <View
                  key={skill}
                  style={{
                    backgroundColor: colors.primaryLight,
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: colors.primaryDark,
                      fontSize: 12,
                      fontFamily: fontFamily.medium,
                    }}
                  >
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Essential skills will appear when a job profile is assigned.
            </Text>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              fontFamily: fontFamily.medium,
            }}
          >
            Job title
          </Text>
          <TextInput
            value={jobTitle}
            onChangeText={(value) => {
              setDirty(true);
              setJobTitle(value);
            }}
            placeholder="Enter your job title"
            placeholderTextColor={colors.textTertiary}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              borderCurve: 'continuous',
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.text,
              fontSize: 15,
              fontFamily: fontFamily.regular,
            }}
          />
        </View>

        <View style={{ gap: 10 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              fontFamily: fontFamily.medium,
            }}
          >
            Interests ({interests.length}/{MAX_INTERESTS})
          </Text>

          {interests.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {interests.map((skill) => (
                <Pressable
                  key={skill}
                  onPress={() => toggleInterest(skill)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: colors.primary,
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text
                    style={{
                      color: colors.onPrimary,
                      fontSize: 13,
                      fontFamily: fontFamily.medium,
                    }}
                  >
                    {skill}
                  </Text>
                  <Ionicons name="close" size={14} color={colors.onPrimary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Pick up to {MAX_INTERESTS} interests that match your goals.
            </Text>
          )}

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search skills to add"
            placeholderTextColor={colors.textTertiary}
            style={{
              backgroundColor: colors.inputBackground,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
              borderCurve: 'continuous',
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.text,
              fontSize: 15,
              fontFamily: fontFamily.regular,
            }}
          />

          <View style={{ gap: 4 }}>
            {filteredOptions.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => toggleInterest(option.value)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 14,
                    fontFamily: fontFamily.regular,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Button
          title="Save Skills"
          onPress={handleSave}
          loading={isSaving}
          disabled={!canSave}
          fullWidth
        />
      </View>
    </ScreenLayout>
  );
}
