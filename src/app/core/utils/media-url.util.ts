import { environment } from '../../../environments/environment';
import { MediaImage } from '../models/media-image.model';

const ABSOLUTE_MEDIA_URL = /^(https?:|data:|blob:|\/\/)/i;

function getMediaBaseUrl(): string {
  const configuredBaseUrl = (environment.backendBaseUrl || '').trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  return globalThis.location?.origin?.replace(/\/$/, '') || '';
}

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
      const parsed = globalThis.location ? new URL(trimmed, globalThis.location.origin) : new URL(trimmed);

      if (globalThis.location && parsed.origin === globalThis.location.origin && parsed.pathname.startsWith('/uploads')) {
        const mediaBaseUrl = getMediaBaseUrl();

        if (mediaBaseUrl) {
          const normalizedBase = mediaBaseUrl.startsWith('/')
            ? new URL(mediaBaseUrl, globalThis.location.origin).toString()
            : mediaBaseUrl;

          return new URL(parsed.pathname + parsed.search + parsed.hash, normalizedBase).toString();
        }
      }
    } catch {
      // Fall through to the original absolute URL.
    }

    return trimmed;
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const mediaBaseUrl = getMediaBaseUrl();

  try {
    if (!mediaBaseUrl) {
      return normalizedPath;
    }

    const baseUrl = mediaBaseUrl.startsWith('/')
      ? globalThis.location
        ? new URL(mediaBaseUrl, globalThis.location.origin).toString()
        : ''
      : mediaBaseUrl;

    if (!baseUrl) {
      return normalizedPath;
    }

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
