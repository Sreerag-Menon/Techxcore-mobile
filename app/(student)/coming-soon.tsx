import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components';
import { ScreenLayout } from '@/layouts';
import { useTheme, fontSize, fontWeight } from '@/theme';

export default function ComingSoonScreen() {
  const { colors } = useTheme();
  const { title } = useLocalSearchParams<{ title?: string }>();
  const screenTitle = typeof title === 'string' ? title : 'Coming soon';

  return (
    <ScreenLayout scrollable={false}>
      <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 24 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: fontSize['2xl'],
            fontWeight: fontWeight.bold,
            marginBottom: 16,
          }}
        >
          {screenTitle}
        </Text>
        <EmptyState
          title="Coming soon"
          message="This feature is on the way. Check back in a future update."
        />
      </View>
    </ScreenLayout>
  );
}
