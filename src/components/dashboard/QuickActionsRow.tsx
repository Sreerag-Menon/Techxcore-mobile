import { memo, useCallback, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import MenuIcon from '@/components/icons/menu/MenuIcon';
import {
  getScrollableMenuItems,
  resolveMobileRoute,
} from '@/navigation/menuRouteMap';
import { useTheme, fontSize, fontWeight } from '@/theme';
import type { MenuItem } from '@/types/menu.types';
import type { MobileRouteTarget } from '@/types/menu.types';

export interface QuickActionsRowProps {
  menuItems: MenuItem[];
}

function navigateFromTarget(target: MobileRouteTarget) {
  switch (target.type) {
    case 'coming_soon':
      router.push({
        pathname: '/(student)/coming-soon',
        params: { title: target.title },
      });
      break;
    case 'tab':
    case 'route':
    case 'hub':
      router.push(target.path as never);
      break;
    default:
      break;
  }
}

const QuickActionsRow = memo(function QuickActionsRow({
  menuItems,
}: QuickActionsRowProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  const scrollItems = useMemo(
    () => getScrollableMenuItems(menuItems),
    [menuItems],
  );

  const handlePress = useCallback(
    (item: MenuItem) => {
      const target = resolveMobileRoute(item, menuItems);
      navigateFromTarget(target);
    },
    [menuItems],
  );

  if (scrollItems.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <Text
        style={{
          color: colors.text,
          fontSize: fontSize.lg,
          fontWeight: fontWeight.bold,
        }}
      >
        Quick Access
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingVertical: 4, paddingRight: 8 }}
      >
        {scrollItems.map((item, index) => {
          const entering = reduceMotion
            ? undefined
            : FadeInRight.delay(index * 60).springify().damping(20);

          return (
            <Animated.View key={item.menu_id} entering={entering}>
              <Pressable
                onPress={() => handlePress(item)}
                style={{ alignItems: 'center', width: 76, gap: 6 }}
                accessibilityRole="button"
                accessibilityLabel={item.menu_name}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 20,
                    backgroundColor: colors.surfaceRaised,
                    alignItems: 'center',
                    justifyContent: 'center',
                    // @ts-ignore
                    borderCurve: 'continuous',
                  }}
                >
                  <MenuIcon
                    logo={item.logo}
                    menuName={item.menu_name}
                    size={28}
                  />
                </View>
                {/* Let numberOfLines + ellipsizeMode handle truncation natively */}
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: fontSize.xs,
                    textAlign: 'center',
                    fontWeight: fontWeight.medium,
                    width: 76,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.menu_name}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
});

export default QuickActionsRow;
