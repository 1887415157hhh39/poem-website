export function publicCloudConfig(url, key) {
  if (!url && !key) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("云端地址配置无效。");
  }
  if (
    parsed.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(parsed.hostname) ||
    parsed.pathname !== "/"
  )
    throw new Error("云端地址配置无效。");
  let safe = /^sb_publishable_[\w-]+$/.test(key || "");
  if (!safe && typeof key === "string" && key.split(".").length === 3) {
    try {
      const value = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      safe = value.role === "anon";
    } catch {}
  }
  if (!safe) throw new Error("浏览器只能使用 Supabase 公开密钥。");
  return { url: parsed.origin, key };
}
