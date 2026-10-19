// Read-only release check. Never submits customer forms or changes production data.
import assert from "node:assert/strict";

const base = new URL(process.argv[2] || "https://bycaretiler.com");
const origin = base.origin;
const problems = [];
let checked = 0;
async function check(label, operation) {
  try {
    await operation();
    checked++;
  } catch (error) {
    problems.push(`${label}: ${error.message}`);
  }
}
async function response(path, options = {}) {
  return fetch(new URL(path, origin), { ...options, signal: AbortSignal.timeout(20000) });
}
const cmsResponse = await response("/api/cms");
assert.equal(cmsResponse.status, 200, "Public CMS must be available");
const cms = await cmsResponse.json();
assert.equal(cms.source, "d1", "Live catalog must come from D1");
assert.ok(Array.isArray(cms.cars), "Catalog must be an array, including when empty");
await check("health", async () => {
  const r = await response("/api/health");
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.d1, true);
  assert.equal(data.r2, true);
  assert.match(data.commit, /^[a-f0-9]{40}$/);
});
await check("home", async () => {
  const r = await response("/");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.ok(html.includes('rel="canonical"'));
  assert.ok(html.includes(`${origin}`), "Canonical must use configured/current origin");
  assert.match(html, /<title>[^<]*ByCar Etiler/);
  assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1, "One semantic home H1");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)[^"]*"/g)].map((m) => m[1]);
  for (const asset of new Set(assets)) {
    const resource = await response(asset, { method: "HEAD" });
    assert.equal(resource.status, 200, asset);
    assert.ok(!resource.headers.get("content-type")?.includes("text/html"), asset);
  }
});
await check("404", async () => {
  assert.equal((await response("/arac/bycar-release-check-does-not-exist")).status, 404);
});
const sitemap = await response("/sitemap.xml");
const xml = await sitemap.text();
await check("sitemap", async () => {
  assert.equal(sitemap.status, 200);
  const listed = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const expected = [
    `${origin}/`,
    ...cms.cars
      .filter((car) => car.status === "active")
      .map((car) => `${origin}/arac/${encodeURIComponent(car.slug || car.id)}`),
  ];
  assert.deepEqual(listed.sort(), expected.sort());
  assert.ok(!/<lastmod>[^<]* /g.test(xml), "Sitemap dates must not contain SQL time suffixes");
});
await check("robots", async () => {
  const r = await response("/robots.txt");
  assert.equal(r.status, 200);
  const robots = await r.text();
  assert.ok(robots.includes(`${origin}/sitemap.xml`));
  assert.ok(robots.includes("Allow: /api/media/"), "Public photos must be crawlable");
  assert.ok(robots.includes("Disallow: /admin"));
});
for (const car of cms.cars)
  await check(`vehicle ${car.id}`, async () => {
    assert.notEqual(car.status, "draft");
    const r = await response(`/arac/${encodeURIComponent(car.slug || car.id)}`);
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.includes('rel="canonical"'));
    assert.ok(html.includes(`${origin}/arac/${encodeURIComponent(car.slug || car.id)}`));
    assert.match(html, /<title>[^<]*ByCar Etiler/);
  });
const media = new Set(
  cms.cars
    .flatMap((car) => [...car.images, ...(car.video ? [car.video] : [])])
    .filter((url) => url.startsWith("/")),
);
for (const path of media)
  await check(`media ${path}`, async () => {
    const r = await response(path, { method: "HEAD" });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") || "", /^(image|video)\//);
  });
const accessRequired = process.env.CF_ACCESS_REQUIRED === "true";
await check(accessRequired ? "admin Access gate" : "admin password login", async () => {
  const r = await response("/admin", { redirect: "manual" });
  if (accessRequired) {
    assert.equal(r.status, 302);
    assert.ok(new URL(r.headers.get("location")).hostname.endsWith(".cloudflareaccess.com"));
  } else {
    assert.equal(r.status, 200);
    assert.match(r.headers.get("content-type") || "", /text\/html/);
    assert.match(r.headers.get("cache-control") || "", /no-store/);
    assert.match(await r.text(), /type="password"/);
  }
});
if (!accessRequired) {
  for (const path of ["/api/admin/me", "/api/admin/inquiries"])
    await check(`anonymous denied ${path}`, async () => {
      const r = await response(path, { redirect: "manual" });
      assert.equal(r.status, 401);
      assert.equal((await r.json()).ok, false);
      assert.match(r.headers.get("cache-control") || "", /no-store/);
    });
  await check("invalid session cannot read admin catalog", async () => {
    const r = await response("/api/cms", {
      headers: { authorization: "Bearer release-check-invalid" },
    });
    assert.equal(r.status, 401);
  });
}
console.log(
  JSON.stringify(
    { origin, checked, vehicles: cms.cars.length, media: media.size, failures: problems },
    null,
    2,
  ),
);
if (problems.length) process.exitCode = 1;
