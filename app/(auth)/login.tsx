import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Alert, Image, Pressable, Switch, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Button, Card } from '../../src/components';
import { FormInput } from '../../src/components/form';
import { KeyboardLayout } from '../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../src/redux';
import {
  clearUserSession,
  loginUser,
  logoutUser,
} from '../../src/redux/slices/authSlice';
import { clearTenant } from '../../src/redux/slices/tenantSlice';
import { useTheme } from '../../src/theme';
import { isParentMemberType, normalizeMemberType } from '../../src/utils';
import type { LoginRejectReason } from '../../src/types/auth.types';

const loginSchema = z.object({
  memberLogin: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  memberPwd: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const currentTenant = useAppSelector((state) => state.tenant.currentTenant);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      memberLogin: '',
      memberPwd: '',
      rememberMe: true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitError(null);
      const response = await dispatch(
        loginUser({
          memberLogin: values.memberLogin.trim(),
          memberPwd: values.memberPwd,
        }),
      ).unwrap();

      // --- Member type gate ---
      // Only Students (member_type: 1) and Parents (member_type: 4) are allowed
      const memberType = normalizeMemberType(response.member_type);
      const isAllowed =
        memberType === '1' ||
        memberType === '4' ||
        memberType.includes('parent') ||
        memberType.includes('student');

      if (!isAllowed) {
        await dispatch(logoutUser());
        setSubmitError('This app is available for Students and Parents only.');
        Toast.show({
          type: 'error',
          text1: 'Access restricted',
          text2: 'This app is available for Students and Parents only.',
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Login successful',
        text2: `Welcome back, ${response.first_name || 'member'}.`,
      });

      const isParent = isParentMemberType(response.member_type);
      router.replace(isParent ? '/(parent)/(tabs)' : '/(student)/(tabs)');
    } catch (error) {
      const reason = error as LoginRejectReason;
      if (reason?.code === 'ALREADY_LOGGED_IN' && reason.uMemberId) {
        Alert.alert(
          'Already signed in',
          reason.message ||
            'You are already logged in on another device. Do you want to continue here?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              style: 'default',
              onPress: async () => {
                try {
                  await dispatch(clearUserSession(reason.uMemberId)).unwrap();
                  const response = await dispatch(
                    loginUser({
                      memberLogin: values.memberLogin.trim(),
                      memberPwd: values.memberPwd,
                    }),
                  ).unwrap();

                  const memberType = normalizeMemberType(response.member_type);
                  const isAllowed =
                    memberType === '1' ||
                    memberType === '4' ||
                    memberType.includes('parent') ||
                    memberType.includes('student');

                  if (!isAllowed) {
                    await dispatch(logoutUser());
                    setSubmitError(
                      'This app is available for Students and Parents only.',
                    );
                    Toast.show({
                      type: 'error',
                      text1: 'Access restricted',
                      text2: 'This app is available for Students and Parents only.',
                    });
                    return;
                  }

                  Toast.show({
                    type: 'success',
                    text1: 'Login successful',
                    text2: `Welcome back, ${response.first_name || 'member'}.`,
                  });

                  const isParent = isParentMemberType(response.member_type);
                  router.replace(
                    isParent ? '/(parent)/(tabs)' : '/(student)/(tabs)',
                  );
                } catch (err) {
                  const fallback =
                    err instanceof Error
                      ? err.message
                      : 'Unable to sign in right now.';
                  setSubmitError(fallback);
                  Toast.show({
                    type: 'error',
                    text1: 'Login failed',
                    text2: fallback,
                  });
                }
              },
            },
          ],
        );
        return;
      }

      const message =
        reason?.code === 'LOGIN_FAILED'
          ? reason.message
          : error instanceof Error
            ? error.message
            : 'Unable to sign in right now.';

      setSubmitError(message);
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: message,
      });
    }
  });

  const handleSwitchInstitution = async () => {
    await dispatch(clearTenant());
    router.replace('/(auth)/select-tenant');
  };

  return (
    <KeyboardLayout contentContainerStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: 24 }}>
        {/* Institution branding */}
        {currentTenant && (
          <View style={{ alignItems: 'center', gap: 10, marginBottom: 8 }}>
            {currentTenant.logoUrl ? (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={{ uri: currentTenant.logoUrl }}
                  style={{ width: 44, height: 44, resizeMode: 'contain' }}
                />
              </View>
            ) : null}
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {currentTenant.siteName}
            </Text>
          </View>
        )}

        <View style={{ gap: 8 }}>
          <Text
            style={{
              color: colors.primary,
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            AAI LMS
          </Text>
          <Text
            style={{
              color: colors.text,
              fontSize: 32,
              fontWeight: '700',
            }}
          >
            Sign in
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            Access your student or parent portal with your existing LMS account.
          </Text>
        </View>

        <Card variant="elevated" padding="lg">
          <View style={{ gap: 16 }}>
            <FormInput
              control={control}
              name="memberLogin"
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <FormInput
              control={control}
              name="memberPwd"
              label="Password"
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
            />

            <Controller
              control={control}
              name="rememberMe"
              render={({ field }) => (
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
                      Keep me signed in
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      Sessions stay active for the token lifetime provided by the LMS.
                    </Text>
                  </View>
                  <Switch
                    value={field.value}
                    onValueChange={field.onChange}
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                  />
                </View>
              )}
            />

            {submitError ? (
              <Text
                style={{
                  color: colors.error,
                  fontSize: 13,
                  lineHeight: 18,
                }}
              >
                {submitError}
              </Text>
            ) : null}

            <Button
              title="Sign In"
              onPress={onSubmit}
              loading={isLoading}
              fullWidth
            />

            <Link href="/(auth)/forgot-password" asChild>
              <Pressable>
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 14,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Forgot your password?
                </Text>
              </Pressable>
            </Link>
          </View>
        </Card>

        {/* Switch institution link */}
        {currentTenant && (
          <Pressable onPress={handleSwitchInstitution}>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                fontWeight: '500',
                textAlign: 'center',
              }}
            >
              Not your institution?{' '}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Switch
              </Text>
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardLayout>
  );
}
