import dns from "dns";
import { isIP } from "net";

const USER_AGENT = "CoworkChat-LinkPreview/1.0";
const FETCH_TIMEOUT_MS = 5000;
const FETCH_MAX_BYTES = 1024 * 1024; // 1 MB
const MAX_REDIRECTS = 3;

export interface UnfurlResult {
  url: string;
  siteName: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

/**
 * Extract the first URL starting with http:// or https:// from text.
 * Trims trailing punctuation properly while preserving balanced brackets.
 */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/i);
  if (!match) return null;

  let url = match[0];

  const trailingPunctuationRegex = /[\.,\?!;'"\)\]\}]$/;
  while (trailingPunctuationRegex.test(url)) {
    const lastChar = url.slice(-1);
    if (lastChar === ")") {
      const openParensCount = (url.match(/\(/g) || []).length;
      const closeParensCount = (url.match(/\)/g) || []).length;
      if (openParensCount >= closeParensCount) {
        break;
      }
    } else if (lastChar === "]") {
      const openBracketCount = (url.match(/\[/g) || []).length;
      const closeBracketCount = (url.match(/\]/g) || []).length;
      if (openBracketCount >= closeBracketCount) {
        break;
      }
    } else if (lastChar === "}") {
      const openBraceCount = (url.match(/\{/g) || []).length;
      const closeBraceCount = (url.match(/\}/g) || []).length;
      if (openBraceCount >= closeBraceCount) {
        break;
      }
    }
    url = url.slice(0, -1);
  }

  return url || null;
}

/**
 * Resolve a hostname to its IP address.
 */
export async function resolveIp(hostname: string): Promise<string> {
  if (isIP(hostname)) {
    return hostname;
  }
  const result = await dns.promises.lookup(hostname);
  return result.address;
}

/**
 * Determine if an IP address belongs to local, private, or restricted ranges (SSRF protection).
 */
export function isPrivateIp(ip: string): boolean {
  if (ip.includes(".")) {
    const parts = ip.split(".").map(Number);
    if (
      parts.length !== 4 ||
      parts.some(isNaN) ||
      parts.some(p => p < 0 || p > 255)
    ) {
      return true;
    }

    const [p0, p1, p2, p3] = parts;
    // 127.0.0.0/8 (loopback)
    if (p0 === 127) return true;
    // 10.0.0.0/8 (private)
    if (p0 === 10) return true;
    // 172.16.0.0/12 (private)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    // 192.168.0.0/16 (private)
    if (p0 === 192 && p1 === 168) return true;
    // 169.254.0.0/16 (link-local, cloud metadata)
    if (p0 === 169 && p1 === 254) return true;
    // 0.0.0.0/8
    if (p0 === 0) return true;
    return false;
  }

  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    // ::1
    if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") return true;
    // fe80::/10 (link-local)
    if (
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      return true;
    }
    // fc00::/7 (unique local address)
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Decode common HTML entities.
 */
export function decodeHtmlEntities(str: string): string {
  return (
    str
      // eslint-disable-next-line quotes
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
  );
}

/**
 * Extract Open Graph, Twitter, or standard head metadata from HTML.
 */
export function parseMetaTags(html: string): {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
} {
  const result: {
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
  } = {};

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const searchSpace = headMatch ? headMatch[1] : html;

  const metaRegex = /<meta\s+([^>]*?)>/gi;
  let match;

  while ((match = metaRegex.exec(searchSpace)) !== null) {
    const metaTagAttrs = match[1];

    const keyMatch = metaTagAttrs.match(
      /(?:property|name)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i
    );
    const key = keyMatch ? keyMatch[1] || keyMatch[2] || keyMatch[3] : null;

    const valueMatch = metaTagAttrs.match(
      /content\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i
    );
    const value = valueMatch
      ? valueMatch[1] || valueMatch[2] || valueMatch[3]
      : null;

    if (key && value) {
      const decodedValue = decodeHtmlEntities(value).trim();
      const lowerKey = key.toLowerCase();

      if (lowerKey === "og:title" && !result.title) result.title = decodedValue;
      if (lowerKey === "twitter:title" && !result.title)
        result.title = decodedValue;

      if (lowerKey === "og:description" && !result.description)
        result.description = decodedValue;
      if (lowerKey === "twitter:description" && !result.description)
        result.description = decodedValue;

      if (lowerKey === "og:image" && !result.image) result.image = decodedValue;
      if (lowerKey === "twitter:image" && !result.image)
        result.image = decodedValue;

      if (lowerKey === "og:site_name" && !result.siteName)
        result.siteName = decodedValue;
      if (lowerKey === "twitter:site" && !result.siteName)
        result.siteName = decodedValue;
    }
  }

  if (!result.title) {
    const titleTagMatch = searchSpace.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTagMatch) {
      result.title = decodeHtmlEntities(titleTagMatch[1]).trim();
    }
  }

  return result;
}

/**
 * Resolve a relative URL against a base URL.
 */
export function resolveRelativeUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

/**
 * Safely fetch the HTML of a URL, enforcing SSRF protections, limits, and timeouts.
 */
export async function fetchWithRedirectAndSizeLimit(
  initialUrl: string
): Promise<{ body: string; finalUrl: string }> {
  let currentUrl = initialUrl;
  let redirectsFollowed = 0;

  while (redirectsFollowed <= MAX_REDIRECTS) {
    const parsedUrl = new URL(currentUrl);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);
    }

    const ip = await resolveIp(parsedUrl.hostname);
    if (isPrivateIp(ip)) {
      throw new Error(
        `SSRF Block: Resolved IP ${ip} is in a restricted range.`
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        redirect: "manual",
        signal: controller.signal
      });

      clearTimeout(timer);

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectsFollowed++;
        if (redirectsFollowed > MAX_REDIRECTS) {
          throw new Error("Too many redirects");
        }
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect status but no location header");
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("text/html")) {
        throw new Error(`Non-HTML content type: ${contentType}`);
      }

      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader) {
        const size = parseInt(contentLengthHeader, 10);
        if (!isNaN(size) && size > FETCH_MAX_BYTES) {
          throw new Error(`Response size exceeds limit: ${size} bytes`);
        }
      }

      let bodyText = "";
      let bytesRead = 0;

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            bytesRead += value.byteLength;
            if (bytesRead > FETCH_MAX_BYTES) {
              throw new Error("Response size exceeds limit");
            }
            bodyText += decoder.decode(value, { stream: true });
          }
        }
        bodyText += decoder.decode();
      } else {
        const text = await response.text();
        if (Buffer.byteLength(text) > FETCH_MAX_BYTES) {
          throw new Error("Response size exceeds limit");
        }
        bodyText = text;
      }

      return { body: bodyText, finalUrl: currentUrl };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  throw new Error("Too many redirects");
}

/**
 * Main unfurl orchestrator function.
 */
export async function unfurlUrl(url: string): Promise<UnfurlResult | null> {
  try {
    const { body, finalUrl } = await fetchWithRedirectAndSizeLimit(url);
    const meta = parseMetaTags(body);

    const title = meta.title || null;
    const description = meta.description || null;
    const imageUrl = meta.image
      ? resolveRelativeUrl(meta.image, finalUrl)
      : null;
    const siteName = meta.siteName || null;

    // Discard preview if title, description, and image are all missing
    if (!title && !description && !imageUrl) {
      return null;
    }

    return {
      url,
      siteName,
      title,
      description,
      imageUrl
    };
  } catch (error) {
    // Fail silently according to spec (return null)
    return null;
  }
}
