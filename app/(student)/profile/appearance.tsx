import { useCallback, useEffect, useState } from 'react';
import { Alert, I18nManager, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import { ProfileSettingsGroup, ProfileSettingsRow } from '@/components';
import { ScreenLayout } from '@/layouts';
import { APP_CONFIG } from '@/constants/config';
import { useTheme } from '@/theme';

type TextDirection = 'ltr' | 'rtl';

export default function AppearanceScreen() {
  const { colors, fontFamily, isDark, toggleTheme } = useTheme();
  const [direction, setDirection] = useState<TextDirection>(
    I18nManager.isRTL ? 'rtl' : 'ltr',
  );

  useEffect(() => {
    AsyncStorage.getItem(APP_CONFIG.DIRECTION_KEY)
      .then((saved) => {
        if (saved === 'ltr' || saved === 'rtl') {
          setDirection(saved);
        }
      })
      .catch(() => undefined);
  }, []);

  const applyDirection = useCallback(async (next: TextDirection) => {
    setDirection(next);
    await AsyncStorage.setItem(APP_CONFIG.DIRECTION_KEY, next);

    const shouldBeRtl = next === 'rtl';
    if (I18nManager.isRTL === shouldBeRtl) {
      Toast.show({
        type: 'success',
        text1: 'Direction updated',
        text2: `Layout direction set to ${next.toUpperCase()}.`,
      });
      return;
    }

    I18nManager.allowRTL(shouldBeRtl);
    I18nManager.forceRTL(shouldBeRtl);

    Alert.alert(
      'Restart required',
      'Text direction changes apply after you fully close and reopen the app.',
      [{ text: 'OK' }],
    );
  }, []);

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
          Control dark mode and reading direction for your account on this device.
        </Text>

        <ProfileSettingsGroup title="Theme">
          <ProfileSettingsRow
            title="Dark mode"
            subtitle="Use a darker palette for low-light reading."
            icon="moon-outline"
            showChevron={false}
            isLast
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
          />
        </ProfileSettingsGroup>

        <ProfileSettingsGroup title="Display direction">
          <ProfileSettingsRow
            title="Left to right"
            subtitle="Default reading direction"
            icon="text-outline"
            onPress={() => {
              void applyDirection('ltr');
            }}
            showChevron={false}
            right={
              direction === 'ltr' ? (
                <Text style={{ color: colors.primary, fontFamily: fontFamily.medium }}>
                  Active
                </Text>
              ) : undefined
            }
          />
          <ProfileSettingsRow
            title="Right to left"
            subtitle="Mirrors layout for RTL languages"
            icon="swap-horizontal-outline"
            onPress={() => {
              void applyDirection('rtl');
            }}
            showChevron={false}
            isLast
            right={
              direction === 'rtl' ? (
                <Text style={{ color: colors.primary, fontFamily: fontFamily.medium }}>
                  Active
                </Text>
              ) : undefined
            }
          />
        </ProfileSettingsGroup>
      </View>
    </ScreenLayout>
  );
}
