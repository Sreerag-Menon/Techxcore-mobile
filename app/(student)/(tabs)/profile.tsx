import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import {
  ErrorState,
  LoadingScreen,
  ProfileIdentityHeader,
  ProfileSettingsGroup,
  ProfileSettingsRow,
  Skeleton,
} from '@/components';
import { ScreenLayout, TabLayout } from '@/layouts';
import { APP_CONFIG } from '@/constants/config';
import { useResponsive } from '@/hooks';
import { useAppDispatch, useAppSelector } from '@/redux';
import { logoutUser, setSessionUser } from '@/redux/slices/authSlice';
import {
  fetchUserProfile,
  setUserProfile,
} from '@/redux/slices/userSlice';
import {
  normalizeAvatarUri,
  updateMemberProfilePhoto,
} from '@/services/profile';

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const reduceMotion = useReducedMotion();
  const { fluid, isTablet } = useResponsive();
  const authUser = useAppSelector((state) => state.auth.user);
  const { profile, isLoading, error } = useAppSelector((state) => state.user);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const sectionGap = fluid(16, 20);

  const loadProfile = useCallback(async () => {
    await dispatch(fetchUserProfile()).unwrap();
  }, [dispatch]);

  useEffect(() => {
    if (!profile) {
      void loadProfile();
    }
  }, [loadProfile, profile]);

  const passwordExpiry =
    profile?.password_expiry === true || authUser?.password_expiry === true;

  useEffect(() => {
    if (passwordExpiry) {
      router.push('/(student)/profile/password');
    }
  }, [passwordExpiry]);

  const displayName = useMemo(
    () =>
      [profile?.first_name ?? authUser?.first_name, profile?.last_name ?? authUser?.last_name]
        .filter(Boolean)
        .join(' '),
    [authUser?.first_name, authUser?.last_name, profile?.first_name, profile?.last_name],
  );

  const avatarUrl = normalizeAvatarUri(
    profile?.avatar_url || authUser?.profile_image,
  );

  const enableSkills =
    profile?.enable_skills === true || authUser?.enable_skills === true;

  const enter = (delay: number) =>
    reduceMotion
      ? undefined
      : FadeInDown.springify().damping(20).stiffness(300).delay(delay);

  const handlePickPhoto = async () => {
    if (passwordExpiry) {
      Toast.show({
        type: 'info',
        text1: 'Password expired',
        text2: 'Update your password before changing other profile settings.',
      });
      router.push('/(student)/profile/password');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Photo access is needed to update your profile image.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const base64 = asset.base64;
    if (!base64) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: 'Could not read the selected image.',
      });
      return;
    }

    const byteSize = asset.fileSize ?? estimateBase64Bytes(base64);
    if (byteSize > APP_CONFIG.MAX_PROFILE_PHOTO_BYTES) {
      Toast.show({
        type: 'error',
        text1: 'Image too large',
        text2: 'Please choose an image under 2 MB.',
      });
      return;
    }

    const mime = asset.mimeType || 'image/jpeg';
    const dataUri = `data:${mime};base64,${base64}`;

    setIsUploadingPhoto(true);
    try {
      await updateMemberProfilePhoto({
        photo: dataUri,
        origImage: profile?.avatar_url || authUser?.profile_image || '',
      });

      if (profile) {
        dispatch(setUserProfile({ ...profile, avatar_url: dataUri }));
      }
      if (authUser) {
        dispatch(
          setSessionUser({
            ...authUser,
            profile_image: dataUri,
          }),
        );
      }

      Toast.show({
        type: 'success',
        text1: 'Photo updated',
        text2: 'Your profile photo was saved.',
      });
    } catch (uploadError) {
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2:
          uploadError instanceof Error
            ? uploadError.message
            : 'Unable to update profile photo.',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert('Remove photo', 'Remove your current profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setIsUploadingPhoto(true);
            try {
              await updateMemberProfilePhoto({
                photo: '',
                origImage: profile?.avatar_url || authUser?.profile_image || '',
              });

              if (profile) {
                dispatch(setUserProfile({ ...profile, avatar_url: undefined }));
              }
              if (authUser) {
                dispatch(
                  setSessionUser({
                    ...authUser,
                    profile_image: undefined,
                  }),
                );
              }

              Toast.show({ type: 'success', text1: 'Photo removed' });
            } catch (removeError) {
              Toast.show({
                type: 'error',
                text1: 'Remove failed',
                text2:
                  removeError instanceof Error
                    ? removeError.message
                    : 'Unable to remove photo.',
              });
            } finally {
              setIsUploadingPhoto(false);
            }
          })();
        },
      },
    ]);
  };

  const openPhotoActions = () => {
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose photo', onPress: () => void handlePickPhoto() },
      ...(avatarUrl
        ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: handleRemovePhoto }]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const navigateGuarded = (path: string) => {
    if (passwordExpiry && !path.includes('/password')) {
      Toast.show({
        type: 'info',
        text1: 'Password expired',
        text2: 'Update your password to continue.',
      });
      router.push('/(student)/profile/password');
      return;
    }
    router.push(path as never);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await dispatch(logoutUser()).unwrap();
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading && !profile) {
    return <LoadingScreen label="Loading your profile..." />;
  }

  if (error && !profile && !authUser) {
    return (
      <ScreenLayout scrollable={false}>
        <ErrorState
          title="Profile unavailable"
          message={error}
          onRetry={() => {
            void loadProfile();
          }}
        />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout floatingTabBar maxContentWidth={isTablet ? 560 : undefined}>
      <TabLayout
        title="Profile"
        subtitle={
          passwordExpiry
            ? 'Your password has expired. Update it to unlock the rest of your settings.'
            : 'Account, preferences, and support'
        }
      >
        <Animated.View entering={enter(40)}>
          {isLoading && !profile ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
              <Skeleton variant="circular" width={80} height={80} />
              <Skeleton width="50%" height={22} />
              <Skeleton width="70%" height={14} />
            </View>
          ) : (
            <ProfileIdentityHeader
              name={displayName}
              email={profile?.email || authUser?.email}
              memberType={profile?.member_type || authUser?.member_type || 'Student'}
              registrationNo={
                profile?.registration_no || authUser?.registration_no
              }
              className={profile?.class_name || authUser?.class_name}
              imageUrl={avatarUrl}
              onPressPhoto={openPhotoActions}
              uploading={isUploadingPhoto}
            />
          )}
        </Animated.View>

        <Animated.View entering={enter(90)} style={{ gap: sectionGap }}>
          <ProfileSettingsGroup title="Account">
            <ProfileSettingsRow
              title="Change password"
              subtitle={
                passwordExpiry
                  ? 'Required — your password has expired'
                  : 'Update your sign-in password'
              }
              icon="lock-closed-outline"
              onPress={() => navigateGuarded('/(student)/profile/password')}
            />
            <ProfileSettingsRow
              title="Language"
              subtitle="Choose your preferred language"
              icon="language-outline"
              disabled={passwordExpiry}
              onPress={() => navigateGuarded('/(student)/profile/language')}
              isLast
            />
          </ProfileSettingsGroup>

          <ProfileSettingsGroup title="Preferences">
            <ProfileSettingsRow
              title="Appearance"
              subtitle="Dark mode and display direction"
              icon="color-palette-outline"
              disabled={passwordExpiry}
              onPress={() => navigateGuarded('/(student)/profile/appearance')}
              isLast
            />
          </ProfileSettingsGroup>

          <ProfileSettingsGroup title="Learning">
            <ProfileSettingsRow
              title="My progress"
              subtitle="Curriculum, assessments, and live sessions"
              icon="stats-chart-outline"
              disabled={passwordExpiry}
              onPress={() => navigateGuarded('/(student)/profile/progress')}
              isLast={!enableSkills}
            />
            {enableSkills ? (
              <>
                <ProfileSettingsRow
                  title="Skills"
                  subtitle="Job title and interests"
                  icon="briefcase-outline"
                  disabled={passwordExpiry}
                  onPress={() => navigateGuarded('/(student)/profile/skills')}
                />
                <ProfileSettingsRow
                  title="Skill assessment"
                  subtitle="Mark essential skills you have assessed"
                  icon="checkbox-outline"
                  disabled={passwordExpiry}
                  onPress={() =>
                    navigateGuarded('/(student)/profile/skill-assessment')
                  }
                  isLast
                />
              </>
            ) : null}
          </ProfileSettingsGroup>

          <ProfileSettingsGroup title="Support">
            <ProfileSettingsRow
              title="Helpdesk"
              subtitle="View and re-open your support tickets"
              icon="help-buoy-outline"
              disabled={passwordExpiry}
              onPress={() => navigateGuarded('/(student)/profile/helpdesk')}
              isLast
            />
          </ProfileSettingsGroup>

          <ProfileSettingsGroup>
            <ProfileSettingsRow
              title={isLoggingOut ? 'Signing out…' : 'Log out'}
              icon="log-out-outline"
              destructive
              showChevron={false}
              disabled={isLoggingOut}
              onPress={() => {
                void handleLogout();
              }}
              isLast
            />
          </ProfileSettingsGroup>
        </Animated.View>
      </TabLayout>
    </ScreenLayout>
  );
}
