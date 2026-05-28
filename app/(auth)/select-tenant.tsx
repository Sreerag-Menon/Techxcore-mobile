import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { Button, Card, Input } from '../../src/components';
import { KeyboardLayout } from '../../src/layouts';
import { useAppDispatch, useAppSelector } from '../../src/redux';
import {
  connectTenantByCode,
  clearTenantError,
} from '../../src/redux/slices/tenantSlice';
import { useTheme } from '../../src/theme';

export default function SelectTenantScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();
  const { isValidating, error, currentTenant } = useAppSelector(
    (state) => state.tenant,
  );

  const [tenantCode, setTenantCode] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleConnect = async () => {
    if (!tenantCode.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Institution code required',
        text2: 'Please enter the code provided by your institution.',
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
            : 'Could not connect to this institution.';

      Toast.show({
        type: 'error',
        text1: 'Connection failed',
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

  if (showConfirmation && currentTenant) {
    return (
      <KeyboardLayout contentContainerStyle={{ justifyContent: 'center' }}>
        <View style={{ gap: 24 }}>
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
              Institution Found
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 28,
                fontWeight: '700',
              }}
            >
              Is this your institution?
            </Text>
          </View>

          <Card variant="elevated" padding="lg">
            <View style={{ alignItems: 'center', gap: 16 }}>
              {currentTenant.logoUrl ? (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: currentTenant.logoUrl }}
                    style={{ width: 64, height: 64, resizeMode: 'contain' }}
                  />
                </View>
              ) : (
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 28,
                      fontWeight: '700',
                    }}
                  >
                    {(currentTenant.shortName || currentTenant.siteName || 'I')
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 20,
                    fontWeight: '700',
                    textAlign: 'center',
                  }}
                >
                  {currentTenant.siteName}
                </Text>
                {currentTenant.tenantCode ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      textAlign: 'center',
                    }}
                  >
                    Code: {currentTenant.tenantCode}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>

          <View style={{ gap: 12 }}>
            <Button
              title="Continue to Sign In"
              onPress={handleProceed}
              fullWidth
            />
            <Button
              title="Use a different code"
              onPress={handleChangeInstitution}
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </KeyboardLayout>
    );
  }

  return (
    <KeyboardLayout contentContainerStyle={{ justifyContent: 'center' }}>
      <View style={{ gap: 24 }}>
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
            Connect to your institution
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 15,
              lineHeight: 22,
            }}
          >
            Enter the institution code provided by your school or organization
            to connect to their learning platform.
          </Text>
        </View>

        <Card variant="elevated" padding="lg">
          <View style={{ gap: 16 }}>
            <Input
              label="Institution code"
              placeholder="e.g. AAI001"
              value={tenantCode}
              onChangeText={(text) => {
                setTenantCode(text);
                if (error) dispatch(clearTenantError());
              }}
              error={error ?? undefined}
              autoCapitalize="characters"
              testID="tenant-code-input"
            />

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                lineHeight: 18,
              }}
            >
              Your institution will share this code with students and parents.
              Codes are not case-sensitive.
            </Text>

            <Button
              title="Connect"
              onPress={handleConnect}
              loading={isValidating}
              disabled={!tenantCode.trim()}
              fullWidth
            />
          </View>
        </Card>
      </View>
    </KeyboardLayout>
  );
}
