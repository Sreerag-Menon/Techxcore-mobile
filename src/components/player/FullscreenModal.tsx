import { useEffect, type ReactNode } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
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
      animationType="slide"
      presentationStyle="fullScreen"
      supportedOrientations={[...ALL_ORIENTATIONS]}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View
          style={[
            styles.content,
            {
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
        >
          {children}
        </View>

        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Exit fullscreen"
          style={[
            styles.closeButton,
            {
              top: insets.top + 8,
              right: insets.right + 12,
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
  content: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    justifyContent: 'center',
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
