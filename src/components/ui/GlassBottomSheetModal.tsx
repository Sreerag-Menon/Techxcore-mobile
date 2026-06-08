import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { BottomSheetModal, type BottomSheetModalProps } from '@gorhom/bottom-sheet';

import { useTheme } from '@/theme';
import {
  BottomSheetGlassBackdrop,
  BottomSheetGlassBackground,
} from './BottomSheetGlass';

export type GlassBottomSheetModalHandle = {
  open: () => void;
  close: () => void;
};

export type GlassBottomSheetModalProps = {
  snapPoints: (string | number)[];
  children: ReactNode;
  onDismiss?: () => void;
  enableDynamicSizing?: boolean;
  enablePanDownToClose?: boolean;
  blurIntensity?: number;
  dimOpacity?: number;
} & Pick<BottomSheetModalProps, 'name' | 'stackBehavior' | 'enableContentPanningGesture'>;

export const GlassBottomSheetModal = forwardRef<
  GlassBottomSheetModalHandle,
  GlassBottomSheetModalProps
>(function GlassBottomSheetModal(
  {
    snapPoints,
    children,
    onDismiss,
    enableDynamicSizing = false,
    enablePanDownToClose = true,
    blurIntensity = 55,
    dimOpacity = 0.32,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const memoizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

  useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.present(),
    close: () => sheetRef.current?.dismiss(),
  }));

  const renderBackdrop = useCallback(
    (props: ComponentProps<typeof BottomSheetGlassBackdrop>) => (
      <BottomSheetGlassBackdrop
        {...props}
        blurIntensity={blurIntensity}
        dimOpacity={dimOpacity}
      />
    ),
    [blurIntensity, dimOpacity],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={memoizedSnapPoints}
      enableDynamicSizing={enableDynamicSizing}
      enablePanDownToClose={enablePanDownToClose}
      onDismiss={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundComponent={BottomSheetGlassBackground}
      backgroundStyle={{
        backgroundColor: 'transparent',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
      {...rest}
    >
      {children}
    </BottomSheetModal>
  );
});
