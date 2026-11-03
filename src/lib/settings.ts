import "server-only";
import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/** Logotipo padrão da marca (public/brand). Pode ser trocado em Admin → Configurações. */
export const DEFAULT_LOGO_URL = "/brand/logo.png";

/** Configurações da loja (registro único). Cria o registro padrão na primeira leitura. */
export const getSettings = cache(async () => {
  const existing = await prisma.storeSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  try {
    return await prisma.storeSettings.create({ data: { id: 1, logoUrl: DEFAULT_LOGO_URL } });
  } catch (e) {
    // Requisições simultâneas podem tentar criar ao mesmo tempo: a perdedora apenas relê.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return prisma.storeSettings.findUniqueOrThrow({ where: { id: 1 } });
    throw e;
  }
});

export type StoreSettingsData = Awaited<ReturnType<typeof getSettings>>;
