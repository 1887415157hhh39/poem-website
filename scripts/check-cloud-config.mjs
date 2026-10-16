import { publicCloudConfig } from "../src/lib/cloud-config.mjs";
import { loadEnv } from "vite";
const env = {
  ...loadEnv("production", process.cwd(), "VITE_"),
  ...process.env,
};
const result = publicCloudConfig(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
if (process.env.CI && !result)
  throw new Error("部署需要配置公开的 Supabase URL 和 publishable key。");
console.log(
  result
    ? "Cloud browser configuration validated (public key only)."
    : "Cloud sync not configured; local-only build.",
);
