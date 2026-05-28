import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PdfView } from '@kishannareshpal/expo-pdf';

import { useTheme } from '../../theme';
import { useGetCertificateQuery } from '../../redux/api/playerApi';

export type CertificateViewerProps = {
  coursePublishId: number;
  enabled?: boolean;
};

function safeFileName(input: string) {
  return input.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);
}

export function CertificateViewer({ coursePublishId, enabled }: CertificateViewerProps) {
  const { colors } = useTheme();
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  const { data, isFetching } = useGetCertificateQuery(
    { coursePublishId },
    { skip: !enabled },
  );

  const [localUri, setLocalUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const url = data?.certificateUrl;

  const cachePath = useMemo(() => {
    const base =
      // expo-file-system SDK54 exposes Paths.cache/document; `uri` is present at runtime.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((FileSystem.Paths.cache as any).uri as string | undefined) ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((FileSystem.Paths.document as any).uri as string | undefined) ??
      '';
    if (!base || !url) return '';
    return `${base}cert_${coursePublishId}_${safeFileName(url)}.pdf`;
  }, [coursePublishId, url]);

  useEffect(() => {
    let mounted = true;

    async function resolve() {
      if (!url) {
        setLocalUri(null);
        return;
      }

      try {
        setIsDownloading(true);
        if (!url.startsWith('http') || !cachePath) {
          if (mounted) setLocalUri(url);
          return;
        }

        const info = await FileSystem.getInfoAsync(cachePath);
        if (info.exists && info.uri) {
          if (mounted) setLocalUri(info.uri);
          return;
        }

        const result = await FileSystem.downloadAsync(url, cachePath);
        if (mounted) setLocalUri(result.uri);
      } catch {
        if (mounted) setLocalUri(url);
      } finally {
        if (mounted) setIsDownloading(false);
      }
    }

    void resolve();
    return () => {
      mounted = false;
    };
  }, [cachePath, url]);

  if (!enabled) return null;

  return (
    <>
      <Pressable
        onPress={() => sheetRef.current?.present()}
        style={{
          position: 'absolute',
          left: 18,
          bottom: 74,
          backgroundColor: colors.success,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 10,
          shadowColor: '#000',
          shadowOpacity: 0.22,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '900' }}>Certificate</Text>
      </Pressable>

      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
        )}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12, flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 16 }}>
              Certificate
            </Text>
            <Pressable
              onPress={() => {
                if (!localUri) return;
                void Sharing.shareAsync(localUri).catch(() => {});
              }}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
              disabled={!localUri}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Share</Text>
            </Pressable>
          </View>

          {isFetching || isDownloading ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 10 }}>
              <ActivityIndicator />
              <Text style={{ color: colors.textSecondary }}>
                {isDownloading ? 'Downloading…' : 'Loading…'}
              </Text>
            </View>
          ) : localUri ? (
            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}>
              <PdfView uri={localUri} style={{ flex: 1 }} fitMode="width" />
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary }}>
              Certificate is not available yet.
            </Text>
          )}
        </View>
      </BottomSheetModal>
    </>
  );
}

