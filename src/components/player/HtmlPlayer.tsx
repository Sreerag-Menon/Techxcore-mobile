import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type {
  CourseHtmlEditorModule,
  CourseHtmlLikeModule,
  CourseScormModule,
} from '../../types/course.types';
import {
  inlineHtmlContentFingerprint,
  isNavigableWebUrl,
} from '../../utils/htmlContent';
import { resolveInlineHtmlWebViewSource, type InlineHtmlWebViewSource } from '../../utils/inlineHtmlCache';
import { asyncStorage } from '../../utils/storage';

type HtmlPlayerModule = CourseHtmlLikeModule | CourseHtmlEditorModule | CourseScormModule;

type HtmlPlayerProps = {
  module: HtmlPlayerModule;
  /** Content loaded; enables Mark as complete (web `onAllViewed` / `sectionDone`). */
  onSectionReady?: () => void;
  onCommit?: (payload: { suspendData?: string; completionStatus?: string; progressSeconds?: number }) => void;
  onTerminate?: (payload: { completionStatus?: string }) => void;
};

function scormShimJs(contentId: number) {
  return `
(function() {
  var storageKey = "scorm:suspend_data:${contentId}";
  var cmi = {
    "cmi.completion_status": "incomplete",
    "cmi.success_status": "unknown",
    "cmi.suspend_data": ""
  };

  try {
    var persisted = window.localStorage.getItem(storageKey);
    if (persisted) {
      cmi["cmi.suspend_data"] = persisted;
    }
  } catch (e) {}

  function post(type, payload) {
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
    } catch (e) {}
  }

  function Initialize() { return "true"; }
  function Terminate() {
    post("scormTerminate", { completionStatus: cmi["cmi.completion_status"] });
    return "true";
  }
  function GetValue(key) { return cmi[key] ?? ""; }
  function SetValue(key, value) {
    cmi[key] = String(value);
    if (key === "cmi.suspend_data") {
      try { window.localStorage.setItem(storageKey, String(value)); } catch (e) {}
    }
    return "true";
  }
  function Commit() {
    post("scormCommit", {
      completionStatus: cmi["cmi.completion_status"],
      suspendData: cmi["cmi.suspend_data"]
    });
    return "true";
  }
  function GetLastError() { return "0"; }
  function GetErrorString() { return "No error"; }
  function GetDiagnostic() { return ""; }

  window.API_1484_11 = {
    Initialize: Initialize,
    Terminate: Terminate,
    GetValue: GetValue,
    SetValue: SetValue,
    Commit: Commit,
    GetLastError: GetLastError,
    GetErrorString: GetErrorString,
    GetDiagnostic: GetDiagnostic
  };

  window.API = {
    LMSInitialize: Initialize,
    LMSFinish: Terminate,
    LMSGetValue: GetValue,
    LMSSetValue: SetValue,
    LMSCommit: Commit,
    LMSGetLastError: GetLastError,
    LMSGetErrorString: GetErrorString,
    LMSGetDiagnostic: GetDiagnostic
  };
})(); true;
`;
}

function isInlineHtmlModule(module: HtmlPlayerModule): module is CourseHtmlLikeModule | CourseHtmlEditorModule {
  return module.type !== 'scorm' && module.contentRenderMode === 'inline';
}

function isLocalWebViewUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

function isFileAccessDeniedError(description: string, code?: number): boolean {
  return code === -1 || description.includes('ERR_ACCESS_DENIED');
}

export function HtmlPlayer({ module, onSectionReady, onCommit, onTerminate }: HtmlPlayerProps) {
  const sectionReadyFiredRef = useRef(false);
  const [inlineSource, setInlineSource] = useState<InlineHtmlWebViewSource | null>(null);
  const [inlineLoadError, setInlineLoadError] = useState(false);
  const [uriLoadFailed, setUriLoadFailed] = useState(false);

  const inlineFingerprint = useMemo(() => {
    if (module.type === 'scorm' || module.contentRenderMode !== 'inline') return '';
    return inlineHtmlContentFingerprint(module.url);
  }, [module]);

  useEffect(() => {
    sectionReadyFiredRef.current = false;
    setUriLoadFailed(false);
  }, [module.contentId]);

  useEffect(() => {
    if (module.type === 'scorm' || !isInlineHtmlModule(module)) {
      setInlineSource(null);
      setInlineLoadError(false);
      return;
    }

    let mounted = true;
    setInlineSource(null);
    setInlineLoadError(false);
    setUriLoadFailed(false);

    void resolveInlineHtmlWebViewSource(module.contentId, module.url)
      .then((resolved) => {
        if (mounted) setInlineSource(resolved);
      })
      .catch(() => {
        if (mounted) setInlineLoadError(true);
      });

    return () => {
      mounted = false;
    };
  }, [module.contentId, inlineFingerprint, module.type]);

  const source = useMemo(() => {
    if (module.type === 'scorm') {
      return { uri: module.manifestUrl };
    }

    if (module.contentRenderMode === 'inline') {
      if (!inlineSource) return null;
      if (inlineSource.uri) {
        return { uri: inlineSource.uri };
      }
      return {
        html: inlineSource.html,
        baseUrl: inlineSource.baseUrl,
      };
    }

    if (isNavigableWebUrl(module.url)) {
      return { uri: module.url };
    }

    return null;
  }, [inlineSource, module]);

  const needsInlineFallback =
    module.type !== 'scorm' &&
    'contentRenderMode' in module &&
    module.contentRenderMode === 'uri' &&
    !isNavigableWebUrl(module.url);

  const [fallbackSource, setFallbackSource] = useState<InlineHtmlWebViewSource | null>(null);

  useEffect(() => {
    if (!needsInlineFallback) {
      setFallbackSource(null);
      return;
    }

    let mounted = true;
    void resolveInlineHtmlWebViewSource(module.contentId, module.url)
      .then((resolved) => {
        if (mounted) setFallbackSource(resolved);
      })
      .catch(() => {
        if (mounted) setFallbackSource(null);
      });

    return () => {
      mounted = false;
    };
  }, [module.contentId, inlineFingerprint, module.type, needsInlineFallback]);

  const resolvedSource = useMemo((): { uri: string } | { html: string; baseUrl: string } | null => {
    if (source) {
      if ('uri' in source && source.uri) return { uri: source.uri };
      if (source.html && source.baseUrl) {
        return { html: source.html, baseUrl: source.baseUrl };
      }
      return null;
    }
    if (!fallbackSource) return null;
    if (fallbackSource.uri) return { uri: fallbackSource.uri };
    if (fallbackSource.html && fallbackSource.baseUrl) {
      return { html: fallbackSource.html, baseUrl: fallbackSource.baseUrl };
    }
    return null;
  }, [fallbackSource, source]);

  const useInlineSource =
    module.type !== 'scorm' &&
    (('contentRenderMode' in module && module.contentRenderMode === 'inline') || needsInlineFallback);

  const htmlFallbackSource = useMemo((): { html: string; baseUrl: string } | null => {
    const fromInline =
      inlineSource?.html && inlineSource.baseUrl
        ? { html: inlineSource.html, baseUrl: inlineSource.baseUrl }
        : null;
    if (fromInline) return fromInline;
    if (fallbackSource?.html && fallbackSource.baseUrl) {
      return { html: fallbackSource.html, baseUrl: fallbackSource.baseUrl };
    }
    return null;
  }, [fallbackSource, inlineSource]);

  const webViewSource = useMemo((): { uri: string } | { html: string; baseUrl: string } | null => {
    if (!resolvedSource) return null;
    if (uriLoadFailed && 'uri' in resolvedSource && htmlFallbackSource) {
      return htmlFallbackSource;
    }
    return resolvedSource;
  }, [htmlFallbackSource, resolvedSource, uriLoadFailed]);

  const usesLocalFileUri = Boolean(
    webViewSource && 'uri' in webViewSource && isLocalWebViewUri(webViewSource.uri),
  );

  const isLoadingInline =
    (('contentRenderMode' in module && module.contentRenderMode === 'inline') && !resolvedSource) ||
    (needsInlineFallback && !resolvedSource);

  const tryHtmlFallbackOnFileError = useCallback(
    (description: string, code?: number) => {
      if (!isFileAccessDeniedError(description, code)) return;
      if (!htmlFallbackSource || uriLoadFailed) return;
      setUriLoadFailed(true);
    },
    [htmlFallbackSource, uriLoadFailed],
  );

  const handleWebViewError = useCallback(
    (event: { nativeEvent: { description?: string; code?: number } }) => {
      const { description, code } = event.nativeEvent;
      tryHtmlFallbackOnFileError(description ?? '', code);
    },
    [tryHtmlFallbackOnFileError],
  );

  const handleWebViewHttpError = useCallback(
    (event: { nativeEvent: { description?: string; statusCode?: number } }) => {
      const { description, statusCode } = event.nativeEvent;
      tryHtmlFallbackOnFileError(description ?? '', statusCode);
    },
    [tryHtmlFallbackOnFileError],
  );

  const injectedBeforeLoad = useMemo(() => {
    if (module.type !== 'scorm') return undefined;
    return scormShimJs(module.contentId);
  }, [module]);

  const handleLoadEnd = useCallback(() => {
    if (!onSectionReady || sectionReadyFiredRef.current) return;
    sectionReadyFiredRef.current = true;
    onSectionReady();
  }, [onSectionReady]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as { type?: string; payload?: unknown };
        if (!data?.type || typeof data.type !== 'string') return;

        if (data.type === 'scormCommit') {
          const payload = (data.payload ?? {}) as Record<string, unknown>;
          const suspendData =
            typeof payload.suspendData === 'string' ? payload.suspendData : undefined;
          const completionStatus =
            typeof payload.completionStatus === 'string'
              ? payload.completionStatus
              : undefined;

          if (suspendData != null && suspendData.length < 500_000) {
            void asyncStorage.setItem(`scorm:suspend_data:${module.contentId}`, suspendData);
          }

          onCommit?.({ suspendData, completionStatus });
          return;
        }

        if (data.type === 'scormTerminate') {
          const payload = (data.payload ?? {}) as Record<string, unknown>;
          const completionStatus =
            typeof payload.completionStatus === 'string'
              ? payload.completionStatus
              : undefined;
          onTerminate?.({ completionStatus });
        }
      } catch {
        // ignore malformed messages
      }
    },
    [module.contentId, onCommit, onTerminate],
  );

  if (isLoadingInline) {
    return (
      <View style={[styles.container, styles.centered]}>
        {inlineLoadError ? null : <ActivityIndicator />}
      </View>
    );
  }

  if (!webViewSource) {
    return <View style={styles.container} />;
  }

  const webViewKey = uriLoadFailed
    ? `${module.contentId}-html`
    : String(module.contentId);

  return (
    <View style={styles.container}>
      <WebView
        key={webViewKey}
        source={webViewSource}
        originWhitelist={
          useInlineSource || usesLocalFileUri
            ? ['*', 'file://', 'content://']
            : undefined
        }
        allowFileAccess={usesLocalFileUri}
        allowFileAccessFromFileURLs={usesLocalFileUri}
        allowUniversalAccessFromFileURLs={usesLocalFileUri}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
        onLoadEnd={onSectionReady ? handleLoadEnd : undefined}
        onError={handleWebViewError}
        onHttpError={handleWebViewHttpError}
        onMessage={handleMessage}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 520,
    borderRadius: 16,
    overflow: 'hidden',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
  },
});
