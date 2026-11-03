import "server-only";
import { prisma } from "./db";
import { getCurrentUser } from "./auth/session";

export async function getFavoriteIds() {
  const user = await getCurrentUser();
  if (!user) return new Set<string>();
  const rows = await prisma.favorite.findMany({ where: { userId: user.id }, select: { productId: true } });
  return new Set(rows.map((r) => r.productId));
}
