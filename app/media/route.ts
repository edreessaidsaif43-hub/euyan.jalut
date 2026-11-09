import { getPublicClient } from "@/lib/site";

export const dynamic = "force-dynamic";
const privateHeaders = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const path = params.get("path");
  const client = getPublicClient();
  if (!path || path.length > 512 || !/^[a-zA-Z0-9._/-]+$/.test(path) ||
      path.split("/").some((part) => !part || part === "." || part === "..") || !client) {
    return new Response(null, { status: 404, headers: privateHeaders });
  }
  const { data, error } = await client.storage.from("school-media").createSignedUrl(path, 90,
    params.get("download") === "1" ? { download: true } : undefined);
  if (error || !data) return new Response(null, { status: 404, headers: privateHeaders });
  return new Response(null, { status: 307, headers: { ...privateHeaders, Location: data.signedUrl } });
}
