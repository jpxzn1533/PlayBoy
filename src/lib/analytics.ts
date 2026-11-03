import "server-only";
import { prisma } from "./db";

// Brasília não possui horário de verão desde 2019: UTC-3 fixo.
const TZ = "America/Sao_Paulo";
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY = 86400000;

export type RangeKey = "today" | "7d" | "30d" | "90d" | "custom";
export const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  custom: "Personalizado",
};

/** Início do dia (no fuso de Brasília) que contém `d`, em UTC. */
export function startOfLocalDay(d: Date) {
  const local = d.getTime() - TZ_OFFSET_MS;
  return new Date(Math.floor(local / DAY) * DAY + TZ_OFFSET_MS);
}

const toDateInput = (d: Date) => new Date(d.getTime() - TZ_OFFSET_MS).toISOString().slice(0, 10);
const fromDateInput = (s: string) => {
  const d = new Date(`${s}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getTime() + TZ_OFFSET_MS);
};

export function resolveRange(params: { range?: string; from?: string; to?: string }) {
  const now = new Date();
  const todayStart = startOfLocalDay(now);
  let key = (["today", "7d", "30d", "90d", "custom"].includes(params.range ?? "") ? params.range : "30d") as RangeKey;
  let start: Date;
  let end = new Date(todayStart.getTime() + DAY);

  if (key === "custom") {
    const from = params.from ? fromDateInput(params.from) : null;
    const to = params.to ? fromDateInput(params.to) : null;
    if (from && to && from <= to && to.getTime() - from.getTime() <= 366 * DAY) {
      start = from;
      end = new Date(to.getTime() + DAY);
    } else {
      key = "30d";
      start = new Date(todayStart.getTime() - 29 * DAY);
    }
  } else {
    const days = key === "today" ? 1 : Number(key.replace("d", ""));
    start = new Date(todayStart.getTime() - (days - 1) * DAY);
  }
  const length = end.getTime() - start.getTime();
  return {
    key,
    start,
    end,
    prevStart: new Date(start.getTime() - length),
    prevEnd: start,
    days: Math.round(length / DAY),
    fromInput: toDateInput(start),
    toInput: toDateInput(new Date(end.getTime() - DAY)),
  };
}

export type ResolvedRange = ReturnType<typeof resolveRange>;

const pctChange = (current: number, previous: number) =>
  previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / previous) * 100;

/** Receita e vendas pagas no intervalo [start, end). Sem limites = todo o histórico. */
async function revenueBetween(start?: Date, end?: Date) {
  const r = await prisma.order.aggregate({
    where: { paymentStatus: "PAID", paidAt: { ...(start && { gte: start }), ...(end && { lt: end }) } },
    _sum: { totalCents: true },
    _count: true,
  });
  return { revenue: r._sum.totalCents ?? 0, sales: r._count };
}

async function uniqueVisitors(start: Date, end: Date) {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(DISTINCT "visitorId") AS n FROM "Visit" WHERE "createdAt" >= ${start} AND "createdAt" < ${end}`;
  return Number(rows[0]?.n ?? 0);
}

async function uniqueBuyers(start: Date, end: Date) {
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT COUNT(DISTINCT "userId") AS n FROM "Order"
    WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${start} AND "paidAt" < ${end}`;
  return Number(rows[0]?.n ?? 0);
}

export async function getDashboardData(range: ResolvedRange) {
  const now = new Date();
  const monthStartLocal = new Date(now.getTime() - TZ_OFFSET_MS);
  const monthStart = new Date(Date.UTC(monthStartLocal.getUTCFullYear(), monthStartLocal.getUTCMonth(), 1) + TZ_OFFSET_MS);

  const [
    current,
    previous,
    allTime,
    month,
    pendingOrders,
    totalCustomers,
    newCustomers,
    prevNewCustomers,
    productsTotal,
    productsAvailable,
    leadsTotal,
    leadsPeriod,
    visitors,
    buyers,
    prevVisitors,
    prevBuyers,
  ] = await Promise.all([
    revenueBetween(range.start, range.end),
    revenueBetween(range.prevStart, range.prevEnd),
    revenueBetween(),
    revenueBetween(monthStart),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: range.start, lt: range.end } } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: range.prevStart, lt: range.prevEnd } } }),
    prisma.product.count(),
    prisma.product.count({ where: { active: true, stock: { gt: 0 } } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: range.start, lt: range.end } } }),
    uniqueVisitors(range.start, range.end),
    uniqueBuyers(range.start, range.end),
    uniqueVisitors(range.prevStart, range.prevEnd),
    uniqueBuyers(range.prevStart, range.prevEnd),
  ]);

  const avgTicket = current.sales ? Math.round(current.revenue / current.sales) : 0;
  const prevAvgTicket = previous.sales ? Math.round(previous.revenue / previous.sales) : 0;
  const conversion = visitors ? (buyers / visitors) * 100 : 0;
  const prevConversion = prevVisitors ? (prevBuyers / prevVisitors) * 100 : 0;

  // Séries diárias (dias sem dados são preenchidos com zero)
  const [revenueRows, customerRows, visitorRows, buyerRows, customersBefore, topProducts] = await Promise.all([
    prisma.$queryRaw<{ day: Date; revenue: bigint; sales: bigint }[]>`
      SELECT date_trunc('day', ("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) AS day,
             SUM("totalCents")::bigint AS revenue, COUNT(*)::bigint AS sales
      FROM "Order" WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${range.start} AND "paidAt" < ${range.end}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ day: Date; n: bigint }[]>`
      SELECT date_trunc('day', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) AS day, COUNT(*)::bigint AS n
      FROM "User" WHERE "role" = 'CUSTOMER' AND "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ day: Date; n: bigint }[]>`
      SELECT date_trunc('day', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) AS day, COUNT(DISTINCT "visitorId")::bigint AS n
      FROM "Visit" WHERE "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
      GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<{ day: Date; n: bigint }[]>`
      SELECT date_trunc('day', ("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ}) AS day, COUNT(DISTINCT "userId")::bigint AS n
      FROM "Order" WHERE "paymentStatus" = 'PAID' AND "paidAt" >= ${range.start} AND "paidAt" < ${range.end}
      GROUP BY 1 ORDER BY 1`,
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { lt: range.start } } }),
    prisma.$queryRaw<{ id: string; name: string; quantity: bigint; revenue: bigint }[]>`
      SELECT oi."productId" AS id, MAX(oi."productName") AS name,
             SUM(oi."quantity")::bigint AS quantity, SUM(oi."totalCents")::bigint AS revenue
      FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId"
      WHERE o."paymentStatus" = 'PAID' AND o."paidAt" >= ${range.start} AND o."paidAt" < ${range.end}
      GROUP BY oi."productId" ORDER BY quantity DESC, revenue DESC LIMIT 6`,
  ]);

  const key = (d: Date) => d.toISOString().slice(0, 10);
  const byDay = <T,>(rows: (T & { day: Date })[]) => new Map(rows.map((r) => [key(r.day), r]));
  const rev = byDay(revenueRows);
  const cust = byDay(customerRows);
  const vis = byDay(visitorRows);
  const buy = byDay(buyerRows);

  let cumulative = customersBefore;
  const series = Array.from({ length: range.days }, (_, i) => {
    const dayUtc = new Date(range.start.getTime() + i * DAY);
    const k = toDateInput(dayUtc);
    const newC = Number(cust.get(k)?.n ?? 0);
    cumulative += newC;
    const v = Number(vis.get(k)?.n ?? 0);
    const b = Number(buy.get(k)?.n ?? 0);
    return {
      date: k,
      label: `${k.slice(8, 10)}/${k.slice(5, 7)}`,
      revenue: Number(rev.get(k)?.revenue ?? 0) / 100,
      sales: Number(rev.get(k)?.sales ?? 0),
      newCustomers: newC,
      totalCustomers: cumulative,
      visitors: v,
      buyers: b,
      conversion: v ? Number(((b / v) * 100).toFixed(2)) : 0,
    };
  });

  return {
    kpis: {
      totalRevenue: allTime.revenue,
      monthRevenue: month.revenue,
      periodRevenue: { value: current.revenue, change: pctChange(current.revenue, previous.revenue) },
      sales: { value: current.sales, change: pctChange(current.sales, previous.sales) },
      pendingOrders,
      avgTicket: { value: avgTicket, change: pctChange(avgTicket, prevAvgTicket) },
      totalCustomers,
      newCustomers: { value: newCustomers, change: pctChange(newCustomers, prevNewCustomers) },
      productsTotal,
      productsAvailable,
      leadsTotal,
      leadsPeriod,
      conversion: { value: conversion, change: pctChange(conversion, prevConversion), visitors, buyers },
    },
    series,
    topProducts: topProducts.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: Number(p.quantity),
      revenue: Number(p.revenue) / 100,
    })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
