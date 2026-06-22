import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';

import { AudioPlayer } from '../AudioPlayer';
import { useTheme } from '../../../theme';

export type QuestionMediaProps = {
  content?: string;
  format?: number;
};

export function QuestionMedia({ content, format }: QuestionMediaProps) {
  const { colors } = useTheme();
  const [imageOpen, setImageOpen] = useState(false);

  if (!content) return null;

  if (format === 0) {
    return (
      <View style={[styles.mediaWrap, { borderColor: colors.border }]}>
        <AudioPlayer url={content} />
      </View>
    );
  }

  if (format === 1) {
    return <VideoMedia url={content} />;
  }

  if (format === 2) {
    return (
      <View style={[styles.pdfWrap, { borderColor: colors.border }]}>
        <WebView
          source={{ uri: content }}
          style={styles.pdf}
          startInLoadingState
          scalesPageToFit
        />
      </View>
    );
  }

  if (format === 3) {
    return (
      <>
        <Pressable onPress={() => setImageOpen(true)}>
          <Image source={{ uri: content }} style={styles.image} resizeMode="cover" />
        </Pressable>
        <Modal visible={imageOpen} transparent animationType="fade" onRequestClose={() => setImageOpen(false)}>
          <Pressable style={styles.imageModal} onPress={() => setImageOpen(false)}>
            <Image source={{ uri: content }} style={styles.imageFull} resizeMode="contain" />
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
      Media attached (unsupported format)
    </Text>
  );
}

function VideoMedia({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.videoWrap}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
    </View>
  );
}

const styles = StyleSheet.create({
  mediaWrap: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  video: { width: '100%', height: '100%' },
  pdfWrap: {
    height: 280,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  pdf: { flex: 1 },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFull: { width: '92%', height: '80%' },
});
