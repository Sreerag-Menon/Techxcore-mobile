import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { fontSize, fontWeight } from '@/theme';

const SPRING = { damping: 18, stiffness: 350 };

export interface TabPillProps {
  label: string;
  count?: number;
  isActive: boolean;
  onPress: () => void;
  activeColor: string;
  activeBg: string;
  inactiveColor: string;
  inactiveBg: string;
  borderColor: string;
  inactiveBorder: string;
  /** Show numeric badge when count > 0 */
  showCount?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TabPill = memo(function TabPill({
  label,
  count = 0,
  isActive,
  onPress,
  activeColor,
  activeBg,
  inactiveColor,
  inactiveBg,
  borderColor,
  inactiveBorder,
  showCount = false,
}: TabPillProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.95, SPRING);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING);
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={showCount && count > 0 ? `${label}, ${count}` : label}
      style={[
        animatedStyle,
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: isActive ? activeBg : inactiveBg,
          borderWidth: 1,
          borderColor: isActive ? borderColor : inactiveBorder,
          // @ts-ignore — continuous corners on iOS
          borderCurve: 'continuous',
        },
      ]}
    >
      <Text
        style={{
          color: isActive ? activeColor : inactiveColor,
          fontSize: fontSize.sm,
          fontWeight: isActive ? fontWeight.bold : fontWeight.medium,
        }}
      >
        {label}
      </Text>
      {showCount && count > 0 ? (
        <View
          style={{
            backgroundColor: isActive ? activeColor : inactiveColor,
            borderRadius: 10,
            minWidth: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 5,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: fontWeight.bold,
              fontVariant: ['tabular-nums'],
            }}
          >
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      ) : null}
    </AnimatedPressable>
  );
});

export default TabPill;
