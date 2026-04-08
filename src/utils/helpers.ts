/**
 * Normalizes a URL by removing the hash, default ports, and trailing slashes.
 *
 * @param raw The raw URL string to normalize.
 * @returns The normalized URL string.
 */
export const normalizeUrl = (raw: string): string => {
  const u = new URL(raw);
  u.hash = "";
  if (
    (u.protocol === "http:" && u.port === "80") ||
    (u.protocol === "https:" && u.port === "443")
  ) {
    u.port = "";
  }
  return u.toString().replace(/\/$/, "");
};

/**
 * Checks if two URLs are on the same domain or a subdomain of the other.
 *
 * @param fromUrl The source URL.
 * @param toUrl The target URL.
 * @returns True if the URLs are on the same domain or a subdomain of the other, false otherwise.
 */
export const isSameDomainOrSubdomain = (
  fromUrl: string,
  toUrl: string,
): boolean => {
  const fromHost = new URL(fromUrl).hostname.toLowerCase();
  const toHost = new URL(toUrl).hostname.toLowerCase();

  return toHost === fromHost || toHost.endsWith(`.${fromHost}`);
};
