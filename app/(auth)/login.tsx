/**
 * Login screen — Step 2 of the auth flow.
 *
 * Visual: AuthShell gradient + GlassCard with institution badge in the header.
 * Animations:
 *  - Content springs in via AuthShellContent (FadeInDown.springify)
 *  - Error state triggers animated shake on the form card
 *  - TealProgressLine shows step 1 (66%)
 *  - Institution logo crossfades in from center (fallback for shared element)
 *
 * All Redux logic, react-hook-form, Zod, and router calls are preserved exactly.
 */
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Alert, Image, Pressable, Switch, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Button } from '../../src/components';
import { FormInput } from '../../src/components/form';
import {
  AuthHeader,
  GlassCard,
  AuthShellContent,
  TealProgressLine,
} from '../../src/components/auth';
import { authCopy } from '../../src/constants/authCopy';
import { AuthShell } from '../../src/layouts';
import { getAuthOverlayColors } from '../../src/theme';
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

// ---------------------------------------------------------------------------
// Validation schema (preserved)
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  memberLogin: z
    .string()
    .min(1, authCopy.validation.emailRequired)
    .email(authCopy.validation.emailInvalid),
  memberPwd: z.string().min(1, authCopy.validation.passwordRequired),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------
function ChevronLeftIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, fontFamily, isDark } = useTheme();
  const overlay = getAuthOverlayColors(colors, isDark);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const currentTenant = useAppSelector((state) => state.tenant.currentTenant);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Shake animation for error state
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    // 3-step recoil: quick left snap → spring right → settle centre.
    // damping/stiffness balanced to feel like a physical knock, not a tremor.
    shakeX.value = withSequence(
      withTiming(-6, { duration: 60, easing: Easing.out(Easing.quad) }),
      withSpring(6, { damping: 14, stiffness: 500 }),
      withSpring(0, { damping: 20, stiffness: 350 }),
    );
  };

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      memberLogin: '',
      memberPwd: '',
      rememberMe: true,
    },
  });

  // --- All existing login logic preserved exactly ---
  const onSubmit = handleSubmit(async (values) => {
    try {
      setSubmitError(null);
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
        setSubmitError(authCopy.login.accessRestricted);
        triggerShake();
        Toast.show({
          type: 'error',
          text1: authCopy.login.toastAccessRestricted,
          text2: authCopy.login.accessRestricted,
        });
        return;
      }

      Toast.show({
        type: 'success',
        text1: authCopy.login.toastLoginSuccess,
        text2: authCopy.login.welcomeBack(response.first_name || 'member'),
      });

      const isParent = isParentMemberType(response.member_type);
      router.replace(isParent ? '/(parent)/(tabs)' : '/(student)/(tabs)');
    } catch (error) {
      const reason = error as LoginRejectReason;
      if (reason?.code === 'ALREADY_LOGGED_IN' && reason.uMemberId) {
        Alert.alert(
          authCopy.login.alertAlreadySignedIn,
          reason.message ||
            'You are already logged in on another device. Do you want to continue here?',
          [
            { text: authCopy.login.alertCancel, style: 'cancel' },
            {
              text: authCopy.login.alertContinue,
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
                    setSubmitError(authCopy.login.accessRestricted);
                    triggerShake();
                    Toast.show({
                      type: 'error',
                      text1: authCopy.login.toastAccessRestricted,
                      text2: authCopy.login.accessRestricted,
                    });
                    return;
                  }

                  Toast.show({
                    type: 'success',
                    text1: authCopy.login.toastLoginSuccess,
                    text2: authCopy.login.welcomeBack(response.first_name || 'member'),
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
                  triggerShake();
                  Toast.show({
                    type: 'error',
                    text1: authCopy.login.toastLoginFailed,
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
      triggerShake();
      Toast.show({
        type: 'error',
        text1: authCopy.login.toastLoginFailed,
        text2: message,
      });
    }
  });

  const handleSwitchInstitution = async () => {
    await dispatch(clearTenant());
    router.replace('/(auth)/select-tenant');
  };

  return (
    <AuthShell step={1}>
      <AuthShellContent>
        {/* Institution badge above header */}
        {currentTenant ? (
          <Animated.View
            entering={FadeIn.duration(300)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            {currentTenant.logoUrl ? (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  // @ts-ignore
                  borderCurve: 'continuous',
                  backgroundColor: isDark ? colors.surfaceRaised : colors.onPrimary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <Image
                  source={{ uri: currentTenant.logoUrl }}
                  style={{ width: 28, height: 28, resizeMode: 'contain' }}
                />
              </View>
            ) : (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  // @ts-ignore
                  borderCurve: 'continuous',
                  // Dark: solid elevated surface — clearly visible on near-black gradient
                  // Light: slight white-glass feel on teal
                  backgroundColor: isDark ? colors.surfaceRaised : 'rgba(255, 255, 255, 0.25)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: overlay.title,
                    fontFamily: fontFamily.bold,
                    fontSize: 14,
                  }}
                >
                  {(currentTenant.shortName || currentTenant.siteName || 'I')
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            )}
            <Text
              style={{
                color: overlay.linkAccent,
                fontSize: 14,
                fontFamily: fontFamily.medium,
              }}
            >
              {currentTenant.siteName}
            </Text>
          </Animated.View>
        ) : null}

        <AuthHeader
          eyebrow={authCopy.brandName}
          title={authCopy.login.title}
          subtitle={authCopy.login.subtitle}
        />

        {/* Glass form card — shakes on error */}
        <Animated.View style={shakeStyle}>
          <GlassCard>
            <TealProgressLine step={1} />
            <View style={{ gap: 16 }}>
              <FormInput
                control={control}
                name="memberLogin"
                label={authCopy.login.emailLabel}
                placeholder={authCopy.login.emailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                labelBackground="glass"
              />

              <FormInput
                control={control}
                name="memberPwd"
                label={authCopy.login.passwordLabel}
                placeholder={authCopy.login.passwordPlaceholder}
                secureTextEntry
                autoCapitalize="none"
                labelBackground="glass"
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
                    <Text
                      style={{
                        flex: 1,
                        color: colors.text,
                        fontSize: 15,
                        fontFamily: fontFamily.medium,
                        paddingRight: 12,
                      }}
                    >
                      {authCopy.login.rememberMe}
                    </Text>
                    <Switch
                      value={field.value}
                      onValueChange={field.onChange}
                      trackColor={{
                        false: colors.border,
                        true: colors.primary,
                      }}
                      thumbColor={field.value ? colors.onPrimary : colors.surface}
                    />
                  </View>
                )}
              />

              {/* Error message */}
              {submitError ? (
                <View
                  style={{
                    backgroundColor: `${colors.error}14`,
                    borderRadius: 10,
                    padding: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: colors.error,
                  }}
                >
                  <Text
                    style={{
                      color: colors.error,
                      fontSize: 13,
                      fontFamily: fontFamily.regular,
                      lineHeight: 18,
                    }}
                    accessibilityRole="alert"
                  >
                    {submitError}
                  </Text>
                </View>
              ) : null}

              <Button
                title={authCopy.login.signIn}
                onPress={onSubmit}
                loading={isLoading}
                fullWidth
              />

              <Link href="/(auth)/forgot-password" asChild>
                <Pressable style={{ alignSelf: 'center', paddingVertical: 4 }}>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 14,
                      fontFamily: fontFamily.medium,
                      textDecorationLine: 'underline',
                      textDecorationColor: `${colors.primary}60`,
                    }}
                  >
                    {authCopy.login.forgotPassword}
                  </Text>
                </Pressable>
              </Link>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Switch institution */}
        {currentTenant && (
          <Pressable
            onPress={handleSwitchInstitution}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, gap: 4 }}
          >
            <ChevronLeftIcon color={overlay.link} />
            <Text
              style={{
                color: overlay.link,
                fontSize: 13,
                fontFamily: fontFamily.regular,
              }}
            >
              {authCopy.login.switchInstitutionPrefix} {currentTenant.siteName}?{' '}
              <Text style={{ color: overlay.linkAccent, fontFamily: fontFamily.medium }}>
                {authCopy.login.switchInstitution}
              </Text>
            </Text>
          </Pressable>
        )}
      </AuthShellContent>
    </AuthShell>
  );
}
