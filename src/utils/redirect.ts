type NormalizeOptions = {
  host?: string | null;
};

export function normalizeRedirect(
  target: string | null | undefined,
  options: NormalizeOptions = {},
): string | null {
  if (!target) {
    return null;
  }

  const value = target.trim();

  if (!value) {
    return null;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  if (options.host) {
    try {
      const url = new URL(value);
      const normalizedHost = options.host.toLowerCase();
      if (url.host.toLowerCase() === normalizedHost) {
        return `${url.pathname}${url.search}`;
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  return null;
}
