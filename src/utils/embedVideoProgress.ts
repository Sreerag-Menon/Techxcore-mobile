/**
 * Utilities for embedding third-party video players in a react-native-webview.
 *
 * YouTube videos are now handled by `react-native-youtube-iframe` directly and
 * no longer need an HTML shell. This file retains:
 *  - Vimeo embed HTML builder  (`buildVimeoProgressHtml`)
 *  - YouTube video ID extractor (`extractYoutubeVideoId`)  — used by YoutubeModulePlayer
 *  - Vimeo video ID extractor  (`extractVimeoVideoId`)
 *  - WebView message parser    (`parseEmbedWebViewMessage`)
 *  - Origin constants          (`WEBVIEW_EMBED_ORIGIN`, `WEBVIEW_EMBED_BASE_URL`)
 */

/** Matches app.json ios.bundleIdentifier / android.package (embed identity). */
export const WEBVIEW_EMBED_APP_ID = 'com.aai.mobile';

/** Origin sent to Vimeo embed API via playerVars and WebView baseUrl. */
export const WEBVIEW_EMBED_ORIGIN = `https://${WEBVIEW_EMBED_APP_ID}`;

/** baseUrl for react-native-webview inline HTML (sets HTTP Referer per embed policy). */
export const WEBVIEW_EMBED_BASE_URL = `${WEBVIEW_EMBED_ORIGIN}/`;

export type EmbedWebViewMessage =
  | { type: 'progress'; seconds: number }
  | { type: 'error'; code: number }
  | { type: 'ended' }
  | { type: 'stateChange'; isPlaying: boolean };

// ─── Vimeo ────────────────────────────────────────────────────────────────────

export type VimeoEmbedOptions = {
  seekable?: boolean;
  maxSeekSeconds?: number;
  minSeekSeconds?: number;
};

/** HTML shell for Vimeo player with periodic progress reporting. */
export function buildVimeoProgressHtml(
  videoId: string,
  options: VimeoEmbedOptions = {},
): string {
  const seekable = options.seekable !== false;
  const maxSeekSeconds = Math.max(0, options.maxSeekSeconds ?? 0);
  const minSeekSeconds = Math.max(0, options.minSeekSeconds ?? 0);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
</head>
<body style="margin:0;background:#000;">
<div id="vimeo"></div>
<script src="https://player.vimeo.com/api/player.js"></script>
<script>
  var seekable = ${seekable ? 'true' : 'false'};
  var maxSeekSeconds = ${maxSeekSeconds};
  var minSeekSeconds = ${minSeekSeconds};
  var maxViewedSeconds = maxSeekSeconds;
  var player = new Vimeo.Player('vimeo', {
    id: '${videoId}',
    width: window.innerWidth,
    height: window.innerHeight,
    controls: false,
    keyboard: false
  });
  function clampSeek(seconds) {
    if (seekable) return seconds;
    return Math.min(maxViewedSeconds, Math.max(minSeekSeconds, seconds));
  }
  function report() {
    player.getCurrentTime().then(function(seconds) {
      if (!seekable) {
        maxViewedSeconds = Math.max(maxViewedSeconds, seconds);
        var clamped = clampSeek(seconds);
        if (Math.abs(clamped - seconds) > 0.5) {
          player.setCurrentTime(clamped).catch(function() {});
          seconds = clamped;
        }
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'progress', seconds: seconds }));
      }
    }).catch(function() {});
  }
  function postToApp(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  player.on('timeupdate', report);
  player.on('ended', function() {
    postToApp({ type: 'ended' });
  });
  setInterval(report, 3000);
</script>
</body>
</html>`;
}

// ─── ID extractors ────────────────────────────────────────────────────────────

export function extractYoutubeVideoId(url: string): string | null {
  const youtuBeMatch = url.match(/youtu\.be\/([^?&#/]+)/i);
  if (youtuBeMatch?.[1]) return youtuBeMatch[1];
  const watchMatch = url.match(/[?&]v=([^?&#/]+)/i);
  if (watchMatch?.[1]) return watchMatch[1];
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&#/]+)/i);
  if (embedMatch?.[1]) return embedMatch[1];
  return null;
}

export function extractVimeoVideoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
  return match?.[1] ?? null;
}

// ─── WebView message parser (used by VimeoModulePlayer) ───────────────────────

export function parseEmbedWebViewMessage(raw: string): EmbedWebViewMessage | null {
  try {
    const payload = JSON.parse(raw) as {
      type?: string;
      seconds?: number;
      code?: number;
      isPlaying?: boolean;
    };
    if (payload.type === 'progress' && typeof payload.seconds === 'number') {
      const seconds = payload.seconds;
      return Number.isFinite(seconds) ? { type: 'progress', seconds } : null;
    }
    if (payload.type === 'error' && typeof payload.code === 'number') {
      return { type: 'error', code: payload.code };
    }
    if (payload.type === 'ended') {
      return { type: 'ended' };
    }
    if (payload.type === 'stateChange' && typeof payload.isPlaying === 'boolean') {
      return { type: 'stateChange', isPlaying: payload.isPlaying };
    }
  } catch {
    return null;
  }
  return null;
}

/** @deprecated Prefer parseEmbedWebViewMessage */
export function parseEmbedProgressMessage(raw: string): number | null {
  const message = parseEmbedWebViewMessage(raw);
  if (message?.type === 'progress') {
    return message.seconds;
  }
  return null;
}
