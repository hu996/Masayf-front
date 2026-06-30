import { environment } from '../../../environments/environment';
import { MediaImage } from '../models/media-image.model';

const ABSOLUTE_MEDIA_URL = /^(https?:|data:|blob:|\/\/)/i;

export function resolveMediaUrl(url?: string | null, fallback = ''): string {
  return resolveImageUrl(url, fallback);
}

export function resolveImageUrl(url?: string | null, fallback = ''): string {
  const trimmed = `${url ?? ''}`.trim();

  if (!trimmed) {
    return fallback;
  }

  if (ABSOLUTE_MEDIA_URL.test(trimmed)) {
    try {
      const parsed = new URL(trimmed, globalThis.location?.origin ?? 'http://localhost');
      if (globalThis.location && parsed.origin === globalThis.location.origin && parsed.pathname.startsWith('/uploads')) {
        const backendBaseUrl = (environment.backendBaseUrl || environment.apiBaseUrl).replace(/\/$/, '');
        const normalizedBase = backendBaseUrl.startsWith('/')
          ? new URL(backendBaseUrl, globalThis.location.origin).toString()
          : backendBaseUrl;
        return new URL(parsed.pathname + parsed.search + parsed.hash, normalizedBase).toString();
      }
    } catch {
      // Fall through to the original absolute URL.
    }

    return trimmed;
  }

  const mediaBaseUrl = (environment.backendBaseUrl || environment.apiBaseUrl).replace(/\/$/, '');
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  try {
    const baseUrl = mediaBaseUrl.startsWith('/')
      ? new URL(mediaBaseUrl, globalThis.location?.origin ?? 'http://localhost').toString()
      : mediaBaseUrl;

    return new URL(normalizedPath, baseUrl).toString();
  } catch {
    return normalizedPath;
  }
}

export function resolveMediaImageUrl(image?: string | MediaImage | { imageUrl?: string | null } | null, fallback = ''): string {
  if (!image) {
    return fallback;
  }

  return resolveImageUrl(typeof image === 'string' ? image : image.imageUrl, fallback);
}
