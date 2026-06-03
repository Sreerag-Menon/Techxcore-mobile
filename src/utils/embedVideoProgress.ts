/** HTML shell for YouTube iframe API with progress postMessage to React Native. */
export function buildYoutubeProgressHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;background:#000;">
<div id="player"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
  var player;
  function report() {
    try {
      if (!player || !player.getCurrentTime) return;
      var seconds = player.getCurrentTime();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'progress', seconds: seconds }));
      }
    } catch (e) {}
  }
  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      width: '100%',
      height: '100%',
      videoId: '${videoId}',
      playerVars: { playsinline: 1, rel: 0 },
      events: {
        onStateChange: function() { report(); }
      }
    });
    setInterval(report, 3000);
  }
</script>
</body>
</html>`;
}

/** HTML shell for Vimeo player with periodic progress reporting. */
export function buildVimeoProgressHtml(videoId: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
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
  player.on('timeupdate', report);
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

export function parseEmbedProgressMessage(raw: string): number | null {
  try {
    const payload = JSON.parse(raw) as { type?: string; seconds?: number };
    if (payload.type === 'progress' && typeof payload.seconds === 'number') {
      return Number.isFinite(payload.seconds) ? payload.seconds : null;
    }
  } catch {
    return null;
  }
  return null;
}
