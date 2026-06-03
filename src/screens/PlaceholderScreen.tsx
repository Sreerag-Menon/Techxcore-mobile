import { Text, View } from 'react-native';

import { EmptyState } from '@/components';
import { ScreenLayout } from '@/layouts';
import { useTheme, fontSize, fontWeight } from '@/theme';

type PlaceholderScreenProps = {
  title: string;
};

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const { colors } = useTheme();

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
          {title}
        </Text>
        <EmptyState
          title="Coming soon"
          message={`${title} will be available in a future update.`}
        />
      </View>
    </ScreenLayout>
  );
}

export default PlaceholderScreen;
