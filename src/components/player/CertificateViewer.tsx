import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../theme';
import {
  downloadUrlToCache,
  getCacheFileUri,
} from '../../utils/expoFileCache';
import { PdfWebView } from './PdfWebView';
import { useGetCertificateQuery } from '../../redux/api/playerApi';
import {
  GlassBottomSheetModal,
  type GlassBottomSheetModalHandle,
} from '../ui/GlassBottomSheetModal';

export type CertificateViewerHandle = {
  open: () => void;
};

export type CertificateViewerProps = {
  coursePublishId: number;
  enabled?: boolean;
  showFloatingButton?: boolean;
};

function safeFileName(input: string) {
  return input.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80);
}

export const CertificateViewer = forwardRef<CertificateViewerHandle, CertificateViewerProps>(
  function CertificateViewer({ coursePublishId, enabled, showFloatingButton = true }, ref) {
    const { colors } = useTheme();
    const sheetRef = useRef<GlassBottomSheetModalHandle>(null);
    const snapPoints = useMemo(() => ['85%'], []);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.open(),
    }));

    const { data, isFetching } = useGetCertificateQuery(
      { coursePublishId },
      { skip: !enabled },
    );

    const [localUri, setLocalUri] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const url = data?.certificateUrl;

    const cacheFileName = useMemo(() => {
      if (!url) return '';
      return `cert_${coursePublishId}_${safeFileName(url)}.pdf`;
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
          if (!url.startsWith('http') || !cacheFileName) {
            if (mounted) setLocalUri(url);
            return;
          }

          const cachedUri = getCacheFileUri(cacheFileName);
          if (cachedUri) {
            if (mounted) setLocalUri(cachedUri);
            return;
          }

          const downloadedUri = await downloadUrlToCache(cacheFileName, url);
          if (mounted) setLocalUri(downloadedUri ?? url);
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
    }, [cacheFileName, url]);

    if (!enabled) return null;

    return (
      <>
        {showFloatingButton ? (
          <Pressable
            onPress={() => sheetRef.current?.open()}
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
        ) : null}

        <GlassBottomSheetModal ref={sheetRef} snapPoints={snapPoints}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12, flex: 1 }}>
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
                <PdfWebView uri={localUri} style={{ flex: 1 }} />
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                Certificate is not available yet.
              </Text>
            )}
          </View>
        </GlassBottomSheetModal>
      </>
    );
  },
);
