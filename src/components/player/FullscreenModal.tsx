import { useEffect, type ReactNode } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type FullscreenModalProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

const ALL_ORIENTATIONS = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
] as const;

async function lockFullscreenOrientation() {
  const allSupported = await ScreenOrientation.supportsOrientationLockAsync(
    ScreenOrientation.OrientationLock.ALL,
  ).catch(() => false);

  const lock = allSupported
    ? ScreenOrientation.OrientationLock.ALL
    : ScreenOrientation.OrientationLock.DEFAULT;

  await ScreenOrientation.lockAsync(lock).catch(() => {});
}

async function restorePortraitOrientation() {
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
    () => {},
  );
}

export function FullscreenModal({ visible, onClose, children }: FullscreenModalProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;

    void lockFullscreenOrientation();

    return () => {
      void restorePortraitOrientation();
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => subscription.remove();
  }, [onClose, visible]);

  const handleClose = () => {
    void restorePortraitOrientation();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      supportedOrientations={[...ALL_ORIENTATIONS]}
      onRequestClose={handleClose}
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {children}

        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Exit fullscreen"
          style={[
            styles.closeButton,
            {
              top: Math.max(insets.top, 12),
              right: Math.max(insets.right, 12),
            },
          ]}
          hitSlop={8}
        >
          <Ionicons name="contract" size={20} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});
