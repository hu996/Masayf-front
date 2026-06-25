export type ApiId = string;

export function normalizeId(value: unknown): ApiId | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : String(value);
  }

  const text = String(value).trim();

  if (!text || text.toLowerCase() === 'nan') {
    return null;
  }

  return text;
}
