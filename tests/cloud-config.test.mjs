import { test } from "node:test";
import assert from "node:assert/strict";
import { publicCloudConfig } from "../src/lib/cloud-config.mjs";
test("未配置允许本机学习，部分配置明确报错", () => {
  assert.equal(publicCloudConfig(), null);
  assert.throws(() => publicCloudConfig("https://example.supabase.co"));
  assert.throws(() => publicCloudConfig(undefined, "sb_publishable_abc"));
});
test("浏览器配置仅接受公开密钥和 HTTPS Supabase 地址", () => {
  const url = "https://example.supabase.co";
  assert.equal(publicCloudConfig(url, "sb_publishable_abc-123").url, url);
  assert.throws(() => publicCloudConfig(url, "sb_secret_abc"));
  assert.throws(() =>
    publicCloudConfig("http://example.supabase.co", "sb_publishable_abc"),
  );
  assert.throws(() =>
    publicCloudConfig("https://malicious.example/", "sb_publishable_abc"),
  );
  const jwt = (role) =>
    "header." + btoa(JSON.stringify({ role })).replace(/=/g, "") + ".sig";
  assert.throws(() => publicCloudConfig(url, jwt("service_role")));
  assert.equal(publicCloudConfig(url, jwt("anon")).url, url);
});
