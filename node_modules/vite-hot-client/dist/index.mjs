async function getViteClient(base = "/", warning = true) {
  try {
    const url = `${base}@vite/client`;
    const res = await fetch(url);
    const text = await res.text();
    if (text.startsWith("<") || !res.headers.get("content-type")?.includes("javascript"))
      throw new Error("Not javascript");
    return await import(
      /* @vite-ignore */
      url
    );
  } catch {
    if (warning)
      console.error(`[vite-hot-client] Failed to import "${base}@vite/client"`);
  }
  return void 0;
}
async function createHotContext(path = "/____", base = "/") {
  const viteClient = await getViteClient(base);
  return viteClient?.createHotContext(path);
}
function guessBasesFromPathname(pathname = window.location.pathname) {
  return pathname.split("/").map((i, idx, arr) => arr.slice(0, idx + 1).join("/") || "/");
}
async function tryCreateHotContext(path = "/___", bases) {
  bases = bases ?? guessBasesFromPathname();
  for (const base of bases) {
    const viteClient = await getViteClient(base, false);
    const hot = viteClient?.createHotContext(path);
    if (hot)
      return hot;
  }
  console.error("[vite-hot-client] Failed to import vite client, tried with:", bases);
}

export { createHotContext, getViteClient, guessBasesFromPathname, tryCreateHotContext };
