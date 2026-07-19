import { jsonResponse } from "../../utils/http.js";
import { isShortLinkKey } from "../../utils/shortlink.js";

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const raw = url.searchParams.get("limit");
  let limit = parseInt(raw || "100", 10);
  if (!Number.isFinite(limit) || limit <= 0) limit = 100;
  if (limit > 1000) limit = 1000;

  const cursor = url.searchParams.get("cursor") || undefined;
  const prefix = url.searchParams.get("prefix") || undefined;
  const value = await env.img_url.list({ limit, cursor, prefix });

  return jsonResponse({
    ...value,
    // Hide internal short-link mapping keys from the dashboard file list
    keys: value.keys.filter(key => !isShortLinkKey(key.name)),
  });
}
