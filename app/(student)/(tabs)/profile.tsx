import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Switch, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import {
  Avatar,
  Button,
  Card,
  ErrorState,
  LoadingScreen,
} from '../../../src/components';
import {
  FormImagePicker,
  FormInput,
} from '../../../src/components/form';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { setSessionUser, logoutUser } from '../../../src/redux/slices/authSlice';
import {
  fetchUserProfile,
  setUserProfile,
} from '../../../src/redux/slices/userSlice';
import { requestPasswordChange } from '../../../src/services';
import { useTheme } from '../../../src/theme';

const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
});

const passwordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(6, 'New password must be at least 6 characters'),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .refine(
    (values) => values.new_password === values.confirm_password,
    {
      path: ['confirm_password'],
      message: 'Passwords do not match',
    },
  );

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { colors, isDark, toggleTheme } = useTheme();
  const authUser = useAppSelector((state) => state.auth.user);
  const { profile, isLoading, error } = useAppSelector((state) => state.user);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      avatar_url: '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const loadProfile = useCallback(async () => {
    await dispatch(fetchUserProfile()).unwrap();
  }, [dispatch]);

  useEffect(() => {
    if (!profile) {
      void loadProfile();
    }
  }, [loadProfile, profile]);

  useEffect(() => {
    if (!profile) return;

    profileForm.reset({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      avatar_url: profile.avatar_url ?? '',
    });
  }, [profile, profileForm]);

  const displayName = useMemo(
    () => [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
    [profile],
  );

  const handleSaveProfile = profileForm.handleSubmit(async (values) => {
    if (!profile) return;

    setIsSavingProfile(true);

    try {
      const updatedProfile = {
        ...profile,
        ...values,
      };

      dispatch(setUserProfile(updatedProfile));

      if (authUser) {
        dispatch(
          setSessionUser({
            ...authUser,
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email,
            profile_image: values.avatar_url || authUser.profile_image,
          }),
        );
      }

      Toast.show({
        type: 'success',
        text1: 'Profile updated',
        text2: 'Your profile changes were applied to the current app session.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  });

  const handleChangePassword = passwordForm.handleSubmit(async (values) => {
    setIsChangingPassword(true);

    try {
      const message = await requestPasswordChange(values);
      passwordForm.reset();
      Toast.show({
        type: 'success',
        text1: 'Password updated',
        text2: message,
      });
    } catch (passwordError) {
      Toast.show({
        type: 'error',
        text1: 'Password update failed',
        text2:
          passwordError instanceof Error
            ? passwordError.message
            : 'Unable to change password right now.',
      });
    } finally {
      setIsChangingPassword(false);
    }
  });

  const handleLogout = async () => {
    await dispatch(logoutUser()).unwrap();
    router.replace('/(auth)/login');
  };

  if (isLoading && !profile) {
    return <LoadingScreen label="Loading your profile..." />;
  }

  if (error && !profile) {
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
    <ScreenLayout>
      <TabLayout
        title="Profile"
        subtitle="Manage your personal details, account security, theme, and sign-out preferences."
      >
        <Card variant="elevated" padding="lg">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <Avatar
              imageUrl={profile?.avatar_url || authUser?.profile_image}
              name={displayName}
              size="xl"
            />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontWeight: '700',
                }}
              >
                {displayName || 'Member'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {profile?.email || authUser?.email}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {profile?.member_type || authUser?.member_type || 'Student'}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="elevated" padding="lg">
          <View style={{ gap: 16 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              Personal Details
            </Text>

            <FormImagePicker
              control={profileForm.control}
              name="avatar_url"
              label="Profile photo"
            />

            <FormInput
              control={profileForm.control}
              name="first_name"
              label="First name"
              placeholder="First name"
            />
            <FormInput
              control={profileForm.control}
              name="last_name"
              label="Last name"
              placeholder="Last name"
            />
            <FormInput
              control={profileForm.control}
              name="email"
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <FormInput
              control={profileForm.control}
              name="phone"
              label="Phone"
              placeholder="Optional phone number"
              keyboardType="phone-pad"
            />

            <Button
              title="Save Changes"
              onPress={handleSaveProfile}
              loading={isSavingProfile}
              fullWidth
            />
          </View>
        </Card>

        <Card variant="elevated" padding="lg">
          <View style={{ gap: 16 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              Change Password
            </Text>

            <FormInput
              control={passwordForm.control}
              name="old_password"
              label="Current password"
              placeholder="Enter your current password"
              secureTextEntry
              autoCapitalize="none"
            />
            <FormInput
              control={passwordForm.control}
              name="new_password"
              label="New password"
              placeholder="Create a new password"
              secureTextEntry
              autoCapitalize="none"
            />
            <FormInput
              control={passwordForm.control}
              name="confirm_password"
              label="Confirm password"
              placeholder="Confirm the new password"
              secureTextEntry
              autoCapitalize="none"
            />

            <Button
              title="Update Password"
              onPress={handleChangePassword}
              loading={isChangingPassword}
              fullWidth
            />
          </View>
        </Card>

        <Card variant="elevated" padding="lg">
          <View style={{ gap: 16 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              Settings
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  Dark mode
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                  Switch between light and dark appearance.
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>

            <Button
              title="Log Out"
              onPress={handleLogout}
              variant="outline"
              fullWidth
            />
          </View>
        </Card>
      </TabLayout>
    </ScreenLayout>
  );
}
