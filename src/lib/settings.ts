import "server-only";
import { cache } from "react";
import { prisma } from "./db";

export const getSettings = cache(async () => {
  const existing = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  return existing ?? prisma.storeSettings.create({ data: { id: 1 } });
});

export type StoreSettingsData = Awaited<ReturnType<typeof getSettings>>;
