const xHosts = new Set(["x.com", "www.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]);
const handlePattern = /^[a-z0-9_]{1,15}$/i;
const nonProfilePaths = new Set([
  "about", "compose", "explore", "home", "i", "intent", "login", "messages", "notifications",
  "privacy", "search", "settings", "share", "signup", "tos",
]);

function parseXUrl(value: string) {
  if (value.length > 500) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && xHosts.has(url.hostname) && !url.username && !url.password && !url.port ? url : null;
  } catch {
    return null;
  }
}

export function normalizeXHandle(value: unknown): string {
  if (typeof value !== "string") return "";
  const input = value.trim();
  const profile = parseXUrl(input)?.pathname.match(/^\/([a-z0-9_]{1,15})\/?$/i)?.[1];
  const handle = profile ?? input.replace(/^@/, "");
  return handlePattern.test(handle) && !nonProfilePaths.has(handle.toLowerCase()) ? handle : "";
}

export function normalizeXPostUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const url = parseXUrl(value.trim());
  if (!url) return "";
  const match = url.pathname.match(/^\/([a-z0-9_]{1,15}|i\/web)\/status\/([1-9][0-9]{0,19})(?:\/(?:photo|video)\/[1-9][0-9]*)?\/?$/i);
  if (!match) return "";
  const [, owner, id] = match;
  if (owner.toLowerCase() === "i" || owner.toLowerCase() === "i/web") return `https://x.com/i/web/status/${id}`;
  return normalizeXHandle(owner) ? `https://x.com/${owner}/status/${id}` : "";
}
