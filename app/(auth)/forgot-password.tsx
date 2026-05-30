/**
 * Forgot Password screen — Step 3 of the auth flow.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, Text, View } from 'react-native';
import Toast from 'react-native-toast-message';
import Animated, {
  FadeInUp,
  FadeOutDown,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';

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
import { requestForgotPassword } from '../../src/services';
import { useTheme, getAuthOverlayColors } from '../../src/theme';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, authCopy.validation.emailRequired)
    .email(authCopy.validation.emailInvalid),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

function SuccessIcon({ color }: { color: string }) {
  return (
    <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} opacity={0.2} />
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={1.5} strokeDasharray="62.8" />
      <Path
        d="M8 12L11 15L16 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronLeftIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, fontFamily, isDark } = useTheme();
  const overlay = getAuthOverlayColors(colors, isDark);
  const reduceMotion = useReducedMotion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setIsSubmitting(true);
    try {
      const message = await requestForgotPassword(email.trim());
      setSuccessMessage(message);
      Toast.show({
        type: 'success',
        text1: authCopy.forgotPassword.toastSubmitted,
        text2: message,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : authCopy.forgotPassword.submitFallback;
      Toast.show({
        type: 'error',
        text1: authCopy.forgotPassword.toastFailed,
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <AuthShell step={2}>
      <AuthShellContent>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 }}
        >
          <ChevronLeftIcon color={overlay.eyebrow} />
          <Text
            style={{
              color: overlay.eyebrow,
              fontSize: 14,
              fontFamily: fontFamily.medium,
            }}
          >
            {authCopy.forgotPassword.back}
          </Text>
        </Pressable>

        <AuthHeader
          eyebrow={authCopy.brandName}
          title={authCopy.forgotPassword.title}
          subtitle={authCopy.forgotPassword.subtitle}
        />

        <GlassCard>
          <TealProgressLine step={2} />

          {successMessage ? (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInUp
                .duration(300)
                .easing(Easing.bezier(0.16, 1, 0.3, 1))}
              style={{ alignItems: 'center', gap: 16, paddingVertical: 12 }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: `${colors.success}18`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SuccessIcon color={colors.success} />
              </View>

              <Text
                style={{
                  color: colors.text,
                  fontSize: 20,
                  fontFamily: fontFamily.bold,
                  textAlign: 'center',
                }}
              >
                {authCopy.forgotPassword.successTitle}
              </Text>

              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 14,
                  fontFamily: fontFamily.regular,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {successMessage}
              </Text>

              <Button
                title={authCopy.forgotPassword.backToSignIn}
                onPress={() => router.replace('/(auth)/login')}
                variant="outline"
                fullWidth
              />
            </Animated.View>
          ) : (
            <Animated.View
              exiting={reduceMotion ? undefined : FadeOutDown.duration(180)}
              style={{ gap: 16 }}
            >
              <FormInput
                control={control}
                name="email"
                label={authCopy.forgotPassword.emailLabel}
                placeholder={authCopy.forgotPassword.emailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                labelBackground="glass"
              />

              <Button
                title={authCopy.forgotPassword.sendInstructions}
                onPress={onSubmit}
                loading={isSubmitting}
                fullWidth
              />
            </Animated.View>
          )}
        </GlassCard>
      </AuthShellContent>
    </AuthShell>
  );
}
