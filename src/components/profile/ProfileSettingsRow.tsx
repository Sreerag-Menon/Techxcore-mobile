import { memo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ProfileSettingsRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  showChevron?: boolean;
  isLast?: boolean;
}

const ProfileSettingsRow = memo(function ProfileSettingsRow({
  title,
  subtitle,
  icon,
  onPress,
  right,
  destructive = false,
  disabled = false,
  showChevron = true,
  isLast = false,
}: ProfileSettingsRowProps) {
  const { colors, fontFamily } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const titleColor = destructive
    ? colors.error
    : disabled
      ? colors.textTertiary
      : colors.text;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minHeight: 56,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.divider,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: destructive ? `${colors.error}18` : colors.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={icon}
            size={18}
            color={destructive ? colors.error : colors.primary}
          />
        </View>
      ) : null}

      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: titleColor,
            fontSize: 15,
            fontFamily: fontFamily.medium,
            letterSpacing: -0.1,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
              lineHeight: 16,
              fontFamily: fontFamily.regular,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right}
      {!right && showChevron && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      }}
      style={animatedStyle}
    >
      {content}
    </AnimatedPressable>
  );
});

export default ProfileSettingsRow;
