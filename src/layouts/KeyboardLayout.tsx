import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { useResponsive } from '@/hooks';

interface KeyboardLayoutProps extends PropsWithChildren {
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  maxWidth?: number;
}

export default function KeyboardLayout({
  children,
  contentContainerStyle,
  style,
  maxWidth,
}: KeyboardLayoutProps) {
  const { colors } = useTheme();
  const { horizontalPadding, verticalPadding } = useResponsive();

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              flexGrow: 1,
              paddingHorizontal: horizontalPadding,
              paddingVertical: verticalPadding,
            },
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              maxWidth: maxWidth ?? 560,
              width: '100%',
              alignSelf: 'center',
              flexGrow: 1,
            }}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

