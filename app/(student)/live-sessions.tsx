import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components';
import { ScreenLayout } from '@/layouts';
import { resolveMobileRoute } from '@/navigation/menuRouteMap';
import { useAppSelector } from '@/redux';
import { useTheme, fontSize, fontWeight } from '@/theme';

export default function LiveSessionsScreen() {
  const { colors } = useTheme();
  const menuItems = useAppSelector((state) => state.menu.items);

  const liveParent = menuItems.find((item) =>
    /live sessions?/i.test(item.menu_name),
  );
  const target = liveParent
    ? resolveMobileRoute(liveParent, menuItems)
    : null;
  const children = target?.type === 'hub' ? target.children : [];

  return (
    <ScreenLayout>
      <Text
        style={{
          color: colors.text,
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.bold,
          marginBottom: 8,
        }}
      >
        Live Sessions
      </Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
        Join a live class or watch a recording.
      </Text>

      {children.length === 0 ? (
        <Card variant="outlined" padding="lg">
          <Text style={{ color: colors.textSecondary }}>
            Live session options will appear here once configured for your account.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {children.map((child) => (
            <Card
              key={child.menu_id}
              variant="elevated"
              padding="lg"
              onPress={() => {
                const childTarget = resolveMobileRoute(child, menuItems);
                if (childTarget.type === 'coming_soon') {
                  router.push({
                    pathname: '/(student)/coming-soon',
                    params: { title: child.menu_name },
                  });
                } else if (
                  childTarget.type === 'route' ||
                  childTarget.type === 'tab' ||
                  childTarget.type === 'hub'
                ) {
                  router.push(childTarget.path as never);
                }
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: fontSize.base,
                  fontWeight: fontWeight.semibold,
                }}
              >
                {child.menu_name}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <Pressable onPress={() => router.push('/(student)/join')} style={{ marginTop: 8 }}>
        <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>
          Join session
        </Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(student)/playback')}>
        <Text style={{ color: colors.primary, fontWeight: fontWeight.semibold }}>
          Watch playback
        </Text>
      </Pressable>
    </ScreenLayout>
  );
}
