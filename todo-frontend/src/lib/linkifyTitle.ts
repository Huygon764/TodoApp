export type TitleSegment =
  | { kind: "text"; value: string }
  | { kind: "link"; value: string; href: string };

const HTTP_URL_RE = /https?:\/\/[^\s<>"'`]+/gi;
const TRAILING_PUNCT_RE = /[.,;:!]+$/;

function isHttpUrl(candidate: string): boolean {
  try {
    const protocol = new URL(candidate).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function pushText(segments: TitleSegment[], value: string): void {
  if (!value) return;
  const last = segments[segments.length - 1];
  if (last?.kind === "text") {
    last.value += value;
    return;
  }
  segments.push({ kind: "text", value });
}

/**
 * Split a title into plain text and http(s) link segments.
 * Other schemes and bare hosts stay text.
 */
export function linkifyTitle(text: string): TitleSegment[] {
  const segments: TitleSegment[] = [];
  const re = new RegExp(HTTP_URL_RE.source, HTTP_URL_RE.flags);
  let cursor = 0;

  for (const match of text.matchAll(re)) {
    const raw = match[0];
    const index = match.index ?? 0;
    pushText(segments, text.slice(cursor, index));

    const trailing = raw.match(TRAILING_PUNCT_RE)?.[0] ?? "";
    const href = trailing ? raw.slice(0, -trailing.length) : raw;

    if (href && isHttpUrl(href)) {
      segments.push({ kind: "link", value: href, href });
      pushText(segments, trailing);
    } else {
      pushText(segments, raw);
    }

    cursor = index + raw.length;
  }

  pushText(segments, text.slice(cursor));
  return segments;
}
