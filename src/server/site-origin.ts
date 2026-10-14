// Activate only after DNS/TLS and Access paths are ready on the purchased domain.
export function canonicalSiteRedirect(request: Request, configuredUrl?: string): Response | null {
  if (!configuredUrl) return null;
  let canonical: URL;
  try {
    canonical = new URL(configuredUrl);
    if (
      canonical.protocol !== "https:" ||
      canonical.username ||
      canonical.password ||
      canonical.pathname !== "/" ||
      canonical.search ||
      canonical.hash
    )
      throw new Error("Invalid SITE_URL");
  } catch {
    return new Response("Site domain configuration is invalid", {
      status: 503,
      headers: { "cache-control": "no-store" },
    });
  }
  const source = new URL(request.url);
  if (source.origin === canonical.origin) return null;
  const target = new URL(canonical);
  target.pathname = source.pathname;
  target.search = source.search;
  return new Response(null, {
    status: 308,
    headers: { location: target.href, "cache-control": "no-store" },
  });
}
