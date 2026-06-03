import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router } from 'expo-router';

import MenuIcon from '@/components/icons/menu/MenuIcon';
import {
  BottomSheetGlassBackdrop,
  BottomSheetGlassBackground,
} from '@/components/ui';
import {
  partitionMenuItems,
  resolveMobileRoute,
} from '@/navigation/menuRouteMap';
import { useTheme, fontSize, fontWeight } from '@/theme';
import type { MenuItem } from '@/types/menu.types';
import type { MobileRouteTarget } from '@/types/menu.types';

export type MoreBottomSheetRef = {
  open: () => void;
  close: () => void;
};

export interface MoreBottomSheetProps {
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

const MoreBottomSheet = forwardRef<MoreBottomSheetRef, MoreBottomSheetProps>(
  function MoreBottomSheet({ menuItems }, ref) {
    const { colors } = useTheme();
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['50%', '90%'], []);

    const { moreItems } = useMemo(
      () => partitionMenuItems(menuItems),
      [menuItems],
    );

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.present(),
      close: () => sheetRef.current?.dismiss(),
    }));

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetGlassBackdrop>) => (
        <BottomSheetGlassBackdrop
          {...props}
          blurIntensity={55}
          dimOpacity={0.32}
        />
      ),
      [],
    );

    const handleItemPress = (item: MenuItem) => {
      sheetRef.current?.dismiss();
      const target = resolveMobileRoute(item, menuItems);
      navigateFromTarget(target);
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundComponent={BottomSheetGlassBackground}
        backgroundStyle={{
          backgroundColor: 'transparent',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 32,
            gap: 16,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: fontSize.lg,
              fontWeight: fontWeight.bold,
            }}
          >
            More
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            {moreItems.map((item) => (
              <Pressable
                key={item.menu_id}
                onPress={() => handleItemPress(item)}
                style={{
                  width: '30%',
                  alignItems: 'center',
                  gap: 8,
                  minHeight: 96,
                }}
                accessibilityRole="button"
                accessibilityLabel={item.menu_name}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: colors.surfaceRaised,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MenuIcon logo={item.logo} menuName={item.menu_name} size={24} />
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: fontSize.xs,
                    textAlign: 'center',
                  }}
                  numberOfLines={2}
                >
                  {item.menu_name}
                </Text>
              </Pressable>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);

export default MoreBottomSheet;
