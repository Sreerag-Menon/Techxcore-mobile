import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components';
import { useResponsive } from '@/hooks';
import { useTheme, fontSize, fontWeight, spacing } from '@/theme';
import {
  GraduationIcon,
  RobotIcon,
  MicIcon,
  CalendarEventIcon,
} from '@/components/icons/carousel';

const AUTO_ADVANCE_MS = 5000;
const SLIDE_HEIGHT = 200;
const SLIDE_PEEK = 12; // px of adjacent slide visible on each side
const SLIDE_GAP = 12;

type PromoSlide = {
  id: string;
  title: string;
  description: string;
  buttonTitle: string;
  onPress: () => void;
  /**
   * Muted gradient stops — deliberately restrained.
   * All four cards use deep, near-neutral tints rather than
   * the full-saturation semantic token values.
   */
  gradientStart: string;
  gradientEnd: string;
  BadgeIcon: React.ComponentType<{ size?: number; color?: string }>;
};

/**
 * Builds the slide deck with deliberately muted gradients.
 *
 * Instead of passing raw semantic tokens (primary, info, success, secondary)
 * which are max-saturation values, we derive dark, near-neutral stops
 * that share the brand's hue family but sit at a much lower luminance.
 * Result: a cohesive carousel that doesn't lurch between four unrelated
 * saturated hues every 5 seconds.
 */
function buildSlides(): PromoSlide[] {
  return [
    {
      id: 'premium',
      title: 'Premium Courses',
      description:
        'Hand-picked. Expert-led. Designed for learners who mean business.',
      buttonTitle: 'Explore',
      onPress: () => router.push('/(student)/training-zone'),
      // Teal family — deep teal → near-black teal
      gradientStart: '#0F4F4A',
      gradientEnd: '#082D2A',
      BadgeIcon: GraduationIcon,
    },
    {
      id: 'ai-assessments',
      title: 'AI Assessments',
      description:
        'Instant personalised feedback powered by AI to accelerate your growth.',
      buttonTitle: 'Start',
      onPress: () => router.push('/(student)/(tabs)/assessments'),
      // Blue family — deep slate-blue → near-black blue
      gradientStart: '#1A3A5C',
      gradientEnd: '#0D2035',
      BadgeIcon: RobotIcon,
    },
    {
      id: 'live',
      title: 'Live Sessions',
      description:
        'Join expert-led live sessions and get your questions answered in real-time.',
      buttonTitle: 'Join',
      onPress: () => router.push('/(student)/join'),
      // Green family — deep forest → near-black green
      gradientStart: '#14402A',
      gradientEnd: '#0A2418',
      BadgeIcon: MicIcon,
    },
    {
      id: 'events',
      title: 'Upcoming Events',
      description:
        'Learn, connect, and grow at our next community event.',
      buttonTitle: 'View',
      onPress: () => router.push('/(student)/events'),
      // Amber family — deep amber-brown → near-black brown
      gradientStart: '#4A2E08',
      gradientEnd: '#281904',
      BadgeIcon: CalendarEventIcon,
    },
  ];
}

// ─── Animated FlatList ───────────────────────────────────────────────────────
const AnimatedFlatList = Animated.createAnimatedComponent(
  FlatList<PromoSlide>,
);

// ─── Individual slide with scroll-driven scale ───────────────────────────────
interface SlideItemProps {
  item: PromoSlide;
  index: number;
  slideWidth: number;
  scrollX: SharedValue<number>;
}

const SlideItem = memo(function SlideItem({
  item,
  index,
  slideWidth,
  scrollX,
}: SlideItemProps) {
  const inputRange = [
    (index - 1) * (slideWidth + SLIDE_GAP),
    index * (slideWidth + SLIDE_GAP),
    (index + 1) * (slideWidth + SLIDE_GAP),
  ];

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.94, 1.0, 0.94],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.7, 1.0, 0.7],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  const { BadgeIcon } = item;

  return (
    <Animated.View
      style={[
        {
          width: slideWidth,
          height: SLIDE_HEIGHT,
          marginRight: SLIDE_GAP,
          borderRadius: 16,
          overflow: 'hidden',
          // @ts-ignore
          borderCurve: 'continuous',
        },
        cardStyle,
      ]}
    >
      <LinearGradient
        colors={[item.gradientStart, item.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, padding: spacing.lg }}
      >
        {/* Badge — SVG icon in a frosted pill */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginBottom: 12,
          }}
        >
          <BadgeIcon size={20} color="rgba(255,255,255,0.9)" />
        </View>

        <Text
          style={{
            color: '#FFFFFF',
            fontSize: fontSize.lg,
            fontWeight: fontWeight.bold,
            marginBottom: 6,
          }}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <Text
          style={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: fontSize.sm,
            lineHeight: 19,
            flex: 1,
          }}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        <View style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}>
          <Button
            title={item.buttonTitle}
            onPress={item.onPress}
            size="sm"
            pill
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// ─── Animated indicator dot ──────────────────────────────────────────────────
interface DotProps {
  isActive: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
  label: string;
}

const IndicatorDot = memo(function IndicatorDot({
  isActive,
  activeColor,
  inactiveColor,
  onPress,
  label,
}: DotProps) {
  const reduceMotion = useReducedMotion();

  const dotStyle = useAnimatedStyle(() => ({
    width: withTiming(isActive ? 20 : 6, {
      duration: reduceMotion ? 0 : 200,
    }),
    backgroundColor: isActive ? activeColor : inactiveColor,
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      <Animated.View
        style={[
          { height: 6, borderRadius: 3 },
          dotStyle,
        ]}
      />
    </Pressable>
  );
});

// ─── Main carousel ───────────────────────────────────────────────────────────
const SLIDES = buildSlides();

const DashboardPromoCarousel = memo(function DashboardPromoCarousel() {
  const { width: screenWidth, horizontalPadding } = useResponsive();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();

  const slideWidth = screenWidth - horizontalPadding * 2 - SLIDE_PEEK * 2;

  const listRef = useRef<FlatList<PromoSlide>>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const userInteracting = useRef(false);

  // ── Scroll handler (runs on UI thread) ──────────────────────────────────
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  // ── Auto-advance ─────────────────────────────────────────────────────────
  const scrollToIndex = useCallback(
    (index: number) => {
      listRef.current?.scrollToOffset({
        offset: index * (slideWidth + SLIDE_GAP),
        animated: !reduceMotion,
      });
      setActiveIndex(index);
    },
    [slideWidth, reduceMotion],
  );

  useEffect(() => {
    if (reduceMotion) return undefined;
    const timer = setInterval(() => {
      if (userInteracting.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % SLIDES.length;
        listRef.current?.scrollToOffset({
          offset: next * (slideWidth + SLIDE_GAP),
          animated: true,
        });
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [reduceMotion, slideWidth]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(
        e.nativeEvent.contentOffset.x / (slideWidth + SLIDE_GAP),
      );
      setActiveIndex(index);
      userInteracting.current = false;
    },
    [slideWidth],
  );

  const entering = reduceMotion ? undefined : FadeInDown.delay(100).springify().damping(20);

  const renderSlide = useCallback(
    ({ item, index }: { item: PromoSlide; index: number }) => (
      <SlideItem
        item={item}
        index={index}
        slideWidth={slideWidth}
        scrollX={scrollX}
      />
    ),
    [slideWidth, scrollX],
  );

  return (
    <Animated.View entering={entering} style={{ gap: 12 }}>
      <AnimatedFlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={slideWidth + SLIDE_GAP}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={{
          paddingHorizontal: SLIDE_PEEK,
        }}
        onScrollBeginDrag={() => {
          userInteracting.current = true;
        }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: slideWidth + SLIDE_GAP,
          offset: (slideWidth + SLIDE_GAP) * index,
          index,
        })}
      />

      {/* ── Animated indicator dots ── */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {SLIDES.map((slide, index) => (
          <IndicatorDot
            key={slide.id}
            isActive={index === activeIndex}
            activeColor={colors.primary}
            inactiveColor={colors.border}
            onPress={() => scrollToIndex(index)}
            label={`Go to slide ${index + 1}`}
          />
        ))}
      </View>
    </Animated.View>
  );
});

export default DashboardPromoCarousel;
