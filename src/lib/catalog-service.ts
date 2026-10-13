import { createServerFn } from "@tanstack/react-start";
import { getLiveCmsData, getLiveVehicleBySlug } from "../server/api";

export const fetchLiveCmsData = createServerFn({ method: "GET" }).handler(async () => {
  return await getLiveCmsData();
});

export const fetchLiveVehicle = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    return await getLiveVehicleBySlug(slug);
  });
