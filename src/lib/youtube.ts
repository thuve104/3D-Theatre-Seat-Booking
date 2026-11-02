/**
 * Utilities for detecting and parsing YouTube URLs (watch, youtu.be, embed, shorts)
 * so trailers work seamlessly both as HTML5 <video> streams and YouTube 3D screen embeds.
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Match standard watch?v=, youtu.be/, embed/, shorts/, or live/
  const regex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regex);
  if (match && match[1]) {
    return match[1];
  }

  // Also check if the user pasted a raw 11-char YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function isYouTubeUrl(url?: string | null): boolean {
  return extractYouTubeId(url) !== null;
}

export function getYouTubeEmbedUrl(
  urlOrId: string,
  options: { autoplay?: boolean; muted?: boolean; controls?: boolean } = {}
): string | null {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;

  const params = new URLSearchParams({
    enablejsapi: "1",
    autoplay: options.autoplay ?? true ? "1" : "0",
    mute: options.muted ? "1" : "0",
    controls: options.controls ?? true ? "1" : "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    loop: "1",
    playlist: videoId,
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function getYouTubeThumbnailUrl(urlOrId: string): string | null {
  const videoId = extractYouTubeId(urlOrId);
  if (!videoId) return null;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
