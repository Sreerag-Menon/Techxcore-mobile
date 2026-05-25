import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Button, Card } from '../../src/components';
import { FormInput } from '../../src/components/form';
import { KeyboardLayout } from '../../src/layouts';
import { requestForgotPassword } from '../../src/services';
import { useTheme } from '../../src/theme';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setIsSubmitting(true);

    try {
      const message = await requestForgotPassword(email.trim());
      setSuccessMessage(message);
      Toast.show({
        type: 'success',
        text1: 'Request submitted',
        text2: message,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to submit your password reset request.';

      Toast.show({
        type: 'error',
        text1: 'Request failed',
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <KeyboardLayout contentContainerStyle={{ justifyContent: 'center' }}>
      <Card variant="elevated" padding="lg">
        <View style={{ gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text
              style={{
                color: colors.text,
                fontSize: 28,
                fontWeight: '700',
              }}
            >
              Reset password
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              Enter your registered email address and the LMS will send you the
              next steps.
            </Text>
          </View>

          <FormInput
            control={control}
            name="email"
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {successMessage ? (
            <View
              style={{
                borderRadius: 12,
                padding: 14,
                backgroundColor: `${colors.success}15`,
              }}
            >
              <Text
                style={{
                  color: colors.success,
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: '600',
                }}
              >
                {successMessage}
              </Text>
            </View>
          ) : null}

          <Button
            title="Send Reset Instructions"
            onPress={onSubmit}
            loading={isSubmitting}
            fullWidth
          />
        </View>
      </Card>
    </KeyboardLayout>
  );
}
