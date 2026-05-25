import { ActivityIndicator, Text, View } from 'react-native';

import { useTheme } from '@/theme';

interface LoadingScreenProps {
  label?: string;
}

export default function LoadingScreen({
  label = 'Loading...',
}: LoadingScreenProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        gap: 12,
        paddingHorizontal: 24,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 15,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
