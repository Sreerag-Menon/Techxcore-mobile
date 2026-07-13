import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Toast from 'react-native-toast-message';

import { Button, PasswordStrengthHints } from '@/components';
import { FormInput } from '@/components/form';
import { ScreenLayout } from '@/layouts';
import { useAppDispatch, useAppSelector } from '@/redux';
import { logoutUser } from '@/redux/slices/authSlice';
import { changeMemberPasswordV2 } from '@/services/profile';
import { useTheme } from '@/theme';
import { getPasswordRequirements, isPasswordValid } from '@/utils/passwordValidation';
import { APP_CONFIG } from '@/constants/config';

const passwordSchema = z
  .object({
    old_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(1, 'New password is required'),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .superRefine((values, ctx) => {
    if (!isPasswordValid(values.new_password)) {
      ctx.addIssue({
        code: 'custom',
        path: ['new_password'],
        message: `Password must be at least ${APP_CONFIG.MIN_PASSWORD_LENGTH} characters and include upper, lower, number, and symbol.`,
      });
    }
    if (values.new_password !== values.confirm_password) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirm_password'],
        message: 'Passwords do not match',
      });
    }
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ChangePasswordScreen() {
  const dispatch = useAppDispatch();
  const { colors, fontFamily } = useTheme();
  const authUser = useAppSelector((state) => state.auth.user);
  const profile = useAppSelector((state) => state.user.profile);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
    mode: 'onChange',
  });

  const newPassword = useWatch({ control: form.control, name: 'new_password' }) ?? '';
  const requirements = useMemo(
    () => getPasswordRequirements(newPassword),
    [newPassword],
  );

  const memberId = profile?.member_id ?? authUser?.member_id;

  const onSubmit = form.handleSubmit(async (values) => {
    if (!memberId) {
      Toast.show({
        type: 'error',
        text1: 'Unable to update password',
        text2: 'Member session is missing. Please sign in again.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await changeMemberPasswordV2({
        memberId,
        oldPwd: values.old_password,
        newPwd: values.new_password,
      });

      Toast.show({
        type: 'success',
        text1: 'Password updated',
        text2: 'Please sign in again with your new password.',
      });

      await dispatch(logoutUser()).unwrap();
      router.replace('/(auth)/login');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Password update failed',
        text2: error instanceof Error ? error.message : 'Unable to change password.',
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <ScreenLayout>
      <View style={{ gap: 20, paddingTop: 8 }}>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            lineHeight: 20,
            fontFamily: fontFamily.regular,
          }}
        >
          Choose a strong password. After a successful update you will be signed out.
        </Text>

        <FormInput
          control={form.control}
          name="old_password"
          label="Current password"
          placeholder="Enter your current password"
          secureTextEntry
          autoCapitalize="none"
        />
        <FormInput
          control={form.control}
          name="new_password"
          label="New password"
          placeholder="Create a new password"
          secureTextEntry
          autoCapitalize="none"
        />

        <PasswordStrengthHints requirements={requirements} />

        <FormInput
          control={form.control}
          name="confirm_password"
          label="Confirm password"
          placeholder="Confirm the new password"
          secureTextEntry
          autoCapitalize="none"
        />

        <Button
          title="Update Password"
          onPress={onSubmit}
          loading={isSubmitting}
          fullWidth
        />
      </View>
    </ScreenLayout>
  );
}
