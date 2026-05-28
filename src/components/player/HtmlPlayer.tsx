import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { createMMKV } from 'react-native-mmkv';

import type { CourseHtmlLikeModule, CourseScormModule } from '../../types/course.types';

const storage = createMMKV();

type HtmlPlayerProps = {
  module: CourseHtmlLikeModule | CourseScormModule;
  onCommit?: (payload: { suspendData?: string; completionStatus?: string; progressSeconds?: number }) => void;
  onTerminate?: (payload: { completionStatus?: string }) => void;
};

function scormShimJs(contentId: number) {
  // Keep it as a plain string. Runs before content loads.
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

  // Minimal SCORM 1.2 alias
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

export function HtmlPlayer({ module, onCommit, onTerminate }: HtmlPlayerProps) {
  const uri = module.type === 'scorm' ? module.manifestUrl : module.url;

  const injectedBeforeLoad = useMemo(() => {
    if (module.type !== 'scorm') return undefined;
    return scormShimJs(module.contentId);
  }, [module]);

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

          if (suspendData != null) {
            storage.set(`scorm:suspend_data:${module.contentId}`, suspendData);
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

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri }}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
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
  webview: {
    flex: 1,
  },
});

