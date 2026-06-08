import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import {
  GlassBottomSheetModal,
  type GlassBottomSheetModalHandle,
} from '../ui/GlassBottomSheetModal';
import { PlayerTabs, type PlayerTabsProps } from './PlayerTabs';

export type PlayerTabsSheetHandle = {
  open: () => void;
};

export type PlayerTabsSheetProps = PlayerTabsProps;

export const PlayerTabsSheet = forwardRef<PlayerTabsSheetHandle, PlayerTabsSheetProps>(
  function PlayerTabsSheet(props, ref) {
    const sheetRef = useRef<GlassBottomSheetModalHandle>(null);
    const snapPoints = useMemo(() => ['45%', '85%'], []);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.open(),
    }));

    return (
      <GlassBottomSheetModal ref={sheetRef} snapPoints={snapPoints}>
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 28 }}>
          <PlayerTabs {...props} embedded />
        </BottomSheetScrollView>
      </GlassBottomSheetModal>
    );
  },
);
