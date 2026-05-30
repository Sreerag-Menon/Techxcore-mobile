/**
 * Select Tenant screen — Step 1 of the auth flow.
 *
 * Visual: AuthShell gradient + GlassCard with institution code input.
 * Animations:
 *  - Content enters via AuthShellContent (FadeInDown, ease-out-expo)
 *  - Institution confirmation card: Soft Reveal — scale(0.92→1) + opacity(0→1)
 *    using ease-out-expo (cubic-bezier 0.16, 1, 0.3, 1). No spring, no bounce.
 *  - TealProgressLine shows step 0 (33%)
 *
 * All Redux logic (connectTenantByCode, clearTenantError) is preserved exactly.
 */
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

import { Button, Input } from '../../src/components';
import {
  AuthHeader,
  GlassCard,
  AuthShellContent,
  TealProgressLine,
} from '../../src/components/auth';
import { authCopy } from '../../src/constants/authCopy';
import { AuthShell } from '../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../src/redux';
import {
  connectTenantByCode,
  clearTenantError,
} from '../../src/redux/slices/tenantSlice';
import { useTheme } from '../../src/theme';
import type { TenantConfig } from '../../src/types/tenant.types';

// Building icon for the institution code input left icon
function BuildingIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 21H21M6 21V7L12 3L18 7V21M9 21V15H15V21"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Animated checkmark ring for confirmation
function CheckmarkBadge({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.86"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01L9 11.01"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function SelectTenantScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, fontFamily } = useTheme();
  const { isValidating, error, currentTenant } = useAppSelector(
    (state) => state.tenant,
  );

  const [tenantCode, setTenantCode] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  // --- All existing logic preserved exactly ---
  const handleConnect = async () => {
    if (!tenantCode.trim()) {
      Toast.show({
        type: 'error',
        text1: authCopy.selectTenant.toastCodeRequired,
      });
      return;
    }

    dispatch(clearTenantError());

    try {
      await dispatch(connectTenantByCode(tenantCode)).unwrap();
      setShowConfirmation(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
            ? err
            : authCopy.selectTenant.connectionFallback;

      Toast.show({
        type: 'error',
        text1: authCopy.selectTenant.toastConnectionFailed,
        text2: message,
      });
    }
  };

  const handleProceed = () => {
    router.replace('/(auth)/login');
  };

  const handleChangeInstitution = () => {
    setShowConfirmation(false);
    setTenantCode('');
    dispatch(clearTenantError());
  };

  // --- Confirmation view ---
  if (showConfirmation && currentTenant) {
    return <ConfirmationCard currentTenant={currentTenant} onProceed={handleProceed} onChangeInstitution={handleChangeInstitution} />;
  }

  // --- Connect view ---
  return (
    <AuthShell step={0}>
      <AuthShellContent>
        <AuthHeader
          eyebrow={authCopy.brandName}
          title={authCopy.selectTenant.title}
          subtitle={authCopy.selectTenant.subtitle}
        />

        {/* Glass form card */}
        <GlassCard>
          <TealProgressLine step={0} />
          <View style={{ gap: 16 }}>
            <Input
              label={authCopy.selectTenant.institutionCodeLabel}
              placeholder={authCopy.selectTenant.institutionCodePlaceholder}
              value={tenantCode}
              onChangeText={(text) => {
                setTenantCode(text);
                if (error) dispatch(clearTenantError());
              }}
              error={error ?? undefined}
              autoCapitalize="characters"
              leftIcon={<BuildingIcon color={colors.textSecondary} />}
              labelBackground="glass"
              testID="tenant-code-input"
            />

            <Button
              title={authCopy.selectTenant.connect}
              onPress={handleConnect}
              loading={isValidating}
              disabled={!tenantCode.trim()}
              fullWidth
            />
          </View>
        </GlassCard>
      </AuthShellContent>
    </AuthShell>
  );
}

// ---------------------------------------------------------------------------
// Confirmation Card — extracted so the Soft Reveal hooks run unconditionally
// ---------------------------------------------------------------------------

function ConfirmationCard({
  currentTenant,
  onProceed,
  onChangeInstitution,
}: {
  currentTenant: TenantConfig;
  onProceed: () => void;
  onChangeInstitution: () => void;
}) {
  const { colors, fontFamily } = useTheme();
  const reduceMotion = useReducedMotion();

  // Soft Reveal — ease-out-expo: fast start → exponential deceleration → precise rest
  const scale = useSharedValue(reduceMotion ? 1 : 0.92);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;

    const expoEase = Easing.bezier(0.16, 1, 0.3, 1);

    // Opacity leads (shorter) — establishes presence before scale completes
    opacity.value = withTiming(1, { duration: 240, easing: expoEase });
    // Scale trails slightly — creates the "expanding weight" feel
    scale.value = withTiming(1, { duration: 340, easing: expoEase });

    // Haptic success confirmation (iOS only)
    if (process.env.EXPO_OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [reduceMotion, opacity, scale]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AuthShell step={0}>
      <AuthShellContent>
        <AuthHeader
          eyebrow={authCopy.brandName}
          title={authCopy.selectTenant.confirmTitle}
          titleSize={32}
        />

        <GlassCard>
          <TealProgressLine step={0} />

          <Animated.View
            style={[{ alignItems: 'center', gap: 16 }, cardStyle]}
          >
              {/* Institution logo */}
              <View style={{ position: 'relative' }}>
                <View
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: 20,
                    // @ts-ignore
                    borderCurve: 'continuous',
                    backgroundColor: currentTenant.logoUrl
                      ? colors.surfaceRaised
                      : colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {currentTenant.logoUrl ? (
                    <Image
                      source={{ uri: currentTenant.logoUrl }}
                      style={{ width: 72, height: 72, resizeMode: 'contain' }}
                    />
                  ) : (
                    <Text
                      style={{
                        color: colors.onPrimary,
                        fontSize: 32,
                        fontFamily: fontFamily.black,
                      }}
                    >
                      {(currentTenant.shortName || currentTenant.siteName || 'I')
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  )}
                </View>
                {/* Verified badge */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: -6,
                    right: -6,
                    backgroundColor: colors.success,
                    borderRadius: 14,
                    width: 28,
                    height: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}
                >
                  <CheckmarkBadge color="#FFFFFF" />
                </View>
              </View>

              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 20,
                    fontFamily: fontFamily.bold,
                    textAlign: 'center',
                  }}
                >
                  {currentTenant.siteName}
                </Text>
                {currentTenant.tenantCode ? (
                  <View
                    style={{
                      backgroundColor: colors.primaryLight,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                      borderRadius: 999,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primaryDark,
                        fontSize: 12,
                        fontFamily: fontFamily.medium,
                      }}
                    >
                      {currentTenant.tenantCode}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={{ gap: 10, width: '100%', marginTop: 8 }}>
                <Button
                  title={authCopy.selectTenant.continueToSignIn}
                  onPress={onProceed}
                  fullWidth
                />
                <Button
                  title={authCopy.selectTenant.useDifferentCode}
                  onPress={onChangeInstitution}
                  variant="ghost"
                  fullWidth
                />
              </View>
            </Animated.View>
          </GlassCard>
        </AuthShellContent>
      </AuthShell>
    );
}
