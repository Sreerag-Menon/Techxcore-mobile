/** Matches app.json ios.bundleIdentifier / android.package (YouTube embed identity). */
export const WEBVIEW_EMBED_APP_ID = 'com.aai.mobile';

/** Origin sent to YouTube/Vimeo embed APIs via playerVars and WebView baseUrl. */
export const WEBVIEW_EMBED_ORIGIN = `https://${WEBVIEW_EMBED_APP_ID}`;

/** baseUrl for react-native-webview inline HTML (sets HTTP Referer per Google embed policy). */
export const WEBVIEW_EMBED_BASE_URL = `${WEBVIEW_EMBED_ORIGIN}/`;

export type EmbedWebViewMessage =
  | { type: 'progress'; seconds: number }
  | { type: 'error'; code: number }
  | { type: 'ended' }
  | { type: 'stateChange'; isPlaying: boolean };

export type YoutubeEmbedOptions = {
  seekable?: boolean;
  initialSeekSeconds?: number;
};

/** HTML shell for YouTube iframe API with progress postMessage to React Native. */
export function buildYoutubeProgressHtml(
  videoId: string,
  options: YoutubeEmbedOptions = {},
): string {
  const origin = WEBVIEW_EMBED_ORIGIN;
  const seekable = options.seekable !== false;
  const initialSeek = Math.max(0, options.initialSeekSeconds ?? 0);
  const playerVars = seekable
    ? `playsinline: 1, rel: 0, origin: '${origin}', widget_referrer: '${origin}'`
    : `playsinline: 1, rel: 0, controls: 0, disablekb: 1, origin: '${origin}', widget_referrer: '${origin}'`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="strict-origin-when-cross-origin" />
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
    #player {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
  </style>
</head>
<body>
<div id="player"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
  var player;
  var seekable = ${seekable ? 'true' : 'false'};
  var maxViewedSeconds = ${initialSeek};
  var initialSeekSeconds = ${initialSeek};
  function report() {
    try {
      if (!player || !player.getCurrentTime) return;
      var seconds = player.getCurrentTime();
      if (!seekable && seconds > maxViewedSeconds + 1.5) {
        player.seekTo(maxViewedSeconds, false);
        seconds = maxViewedSeconds;
      } else if (seconds > maxViewedSeconds) {
        maxViewedSeconds = seconds;
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'progress', seconds: seconds }));
      }
    } catch (e) {}
  }
  function postToApp(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      width: '100%',
      height: '100%',
      videoId: '${videoId}',
      playerVars: { ${playerVars} },
      events: {
        onReady: function() {
          if (initialSeekSeconds > 0) {
            try { player.seekTo(initialSeekSeconds, true); } catch (e) {}
          }
        },
        onStateChange: function(event) {
          report();
          try {
            if (window.YT) {
              var isPlaying = event.data === window.YT.PlayerState.PLAYING;
              postToApp({ type: 'stateChange', isPlaying: isPlaying });
              if (event.data === window.YT.PlayerState.ENDED) {
                postToApp({ type: 'ended' });
              }
            }
          } catch (e) {}
        },
        onError: function(event) {
          postToApp({ type: 'error', code: event.data });
        }
      }
    });
    setInterval(report, 3000);
  }
  window.toggleYoutubePlayback = function() {
    try {
      if (!player || !player.getPlayerState) return;
      var state = player.getPlayerState();
      if (state === window.YT.PlayerState.PLAYING) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } catch (e) {}
  };
</script>
</body>
</html>`;
}

/** HTML shell for Vimeo player with periodic progress reporting. */
export function buildVimeoProgressHtml(videoId: string): string {
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
  var player = new Vimeo.Player('vimeo', { id: '${videoId}', width: window.innerWidth, height: window.innerHeight });
  function report() {
    player.getCurrentTime().then(function(seconds) {
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
