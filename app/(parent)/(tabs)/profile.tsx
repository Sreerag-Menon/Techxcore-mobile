import { useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { Switch, Text, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  ErrorState,
  LoadingScreen,
} from '../../../src/components';
import { ScreenLayout, TabLayout } from '../../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../../src/redux';
import { logoutUser } from '../../../src/redux/slices/authSlice';
import { fetchUserProfile } from '../../../src/redux/slices/userSlice';
import { useTheme } from '../../../src/theme';

export default function ParentProfileScreen() {
  const dispatch = useAppDispatch();
  const { colors, isDark, toggleTheme } = useTheme();
  const authUser = useAppSelector((state) => state.auth.user);
  const { profile, isLoading, error } = useAppSelector((state) => state.user);
  const childCount = useAppSelector((state) => state.parent.children.length);

  const loadProfile = useCallback(async () => {
    await dispatch(fetchUserProfile()).unwrap();
  }, [dispatch]);

  useEffect(() => {
    if (!profile) {
      void loadProfile();
    }
  }, [loadProfile, profile]);

  const handleLogout = async () => {
    await dispatch(logoutUser()).unwrap();
    router.replace('/(auth)/login');
  };

  if (isLoading && !profile) {
    return <LoadingScreen label="Loading parent profile..." />;
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

  const displayName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(' ');

  return (
    <ScreenLayout>
      <TabLayout
        title="Parent Profile"
        subtitle="Manage your parent account, preferences, and quick access settings."
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
                {displayName || 'Parent account'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {profile?.email || authUser?.email}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Linked learners: {childCount}
              </Text>
            </View>
          </View>
        </Card>

        <Card variant="elevated" padding="lg">
          <View style={{ gap: 14 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              Account details
            </Text>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Member type
              </Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                {profile?.member_type || authUser?.member_type || 'Parent'}
              </Text>
            </View>
            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Organization
              </Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                {profile?.organization_name || 'AAI LMS'}
              </Text>
            </View>
            {profile?.phone ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Phone
                </Text>
                <Text
                  style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}
                >
                  {profile.phone}
                </Text>
              </View>
            ) : null}
          </View>
        </Card>

        <Card variant="elevated" padding="lg">
          <View style={{ gap: 14 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              Preferences
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
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
                  Change the appearance of the parent portal.
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <Button title="Log Out" onPress={handleLogout} variant="outline" fullWidth />
          </View>
        </Card>
      </TabLayout>
    </ScreenLayout>
  );
}
