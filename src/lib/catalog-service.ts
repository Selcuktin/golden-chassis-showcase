import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getLiveCmsData, getLiveSiteData, getLiveVehicleBySlug, resolveEnv } from "../server/api";

function siteUrl() {
  return (resolveEnv().SITE_URL || new URL(getRequest().url).origin).replace(/\/+$/, "");
}
export const fetchLiveCmsData = createServerFn({ method: "GET" }).handler(async () => {
  return { ...(await getLiveCmsData()), siteUrl: siteUrl() };
});
export const fetchLiveVehicle = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const [car, site] = await Promise.all([getLiveVehicleBySlug(slug), getLiveSiteData()]);
    return { car, settings: site.settings, cmsConfig: site.cmsConfig, siteUrl: siteUrl() };
  });
