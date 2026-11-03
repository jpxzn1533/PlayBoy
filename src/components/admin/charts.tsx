"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardData } from "@/lib/analytics";

// Identidade monocromática: uma série por gráfico, um único eixo, marcas finas e grade recessiva.
const INK = "#f4f4f4";
const GRID = "#1f1f1f";
const AXIS = "#6b6b6b";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brlFull = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compactBrl = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : brl.format(v));

type Series = DashboardData["series"];
type Row = Series[number];

const axisProps = {
  stroke: AXIS,
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function Shell({ data, children, height = 240 }: { data: unknown[]; children: React.ReactElement; height?: number }) {
  if (data.length === 0) return <p className="flex h-40 items-center justify-center text-sm text-subtle">Sem dados no período.</p>;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function TooltipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-line-strong bg-surface-2/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-medium text-fg">{title}</p>
      {rows.map(([k, v]) => (
        <p key={k} className="flex justify-between gap-6 text-muted">
          <span>{k}</span>
          <span className="font-medium text-fg tabular-nums">{v}</span>
        </p>
      ))}
    </div>
  );
}

const tipFor =
  (rows: (r: Row) => [string, string][]) =>
  ({ active, payload }: { active?: boolean; payload?: readonly { payload?: unknown }[] }) => {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload as Row;
    return <TooltipBox title={r.date.split("-").reverse().join("/")} rows={rows(r)} />;
  };

const interval = (n: number) => (n <= 10 ? 0 : Math.ceil(n / 8) - 1);

export function RevenueChart({ data }: { data: Series }) {
  return (
    <Shell data={data}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={INK} stopOpacity={0.22} />
            <stop offset="100%" stopColor={INK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={interval(data.length)} />
        <YAxis {...axisProps} width={72} tickFormatter={compactBrl} />
        <Tooltip cursor={{ stroke: "#444", strokeWidth: 1 }} content={tipFor((r) => [["Faturamento", brlFull.format(r.revenue)], ["Vendas", String(r.sales)]])} />
        <Area type="monotone" dataKey="revenue" stroke={INK} strokeWidth={2} fill="url(#revFill)" activeDot={{ r: 4, stroke: "#080808", strokeWidth: 2 }} />
      </AreaChart>
    </Shell>
  );
}

export function SalesChart({ data }: { data: Series }) {
  return (
    <Shell data={data}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={data.length > 45 ? 1 : "20%"}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={interval(data.length)} />
        <YAxis {...axisProps} width={36} allowDecimals={false} />
        <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} content={tipFor((r) => [["Vendas", String(r.sales)], ["Faturamento", brlFull.format(r.revenue)]])} />
        <Bar dataKey="sales" fill="#d4d4d4" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </Shell>
  );
}

export function CustomersChart({ data }: { data: Series }) {
  return (
    <Shell data={data}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={interval(data.length)} />
        <YAxis {...axisProps} width={44} allowDecimals={false} domain={["dataMin - 2", "dataMax + 2"]} />
        <Tooltip cursor={{ stroke: "#444", strokeWidth: 1 }} content={tipFor((r) => [["Total de clientes", String(r.totalCustomers)], ["Novos no dia", String(r.newCustomers)]])} />
        <Line type="monotone" dataKey="totalCustomers" stroke={INK} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#080808", strokeWidth: 2 }} />
      </LineChart>
    </Shell>
  );
}

export function ConversionChart({ data }: { data: Series }) {
  return (
    <Shell data={data}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={interval(data.length)} />
        <YAxis {...axisProps} width={44} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip
          cursor={{ stroke: "#444", strokeWidth: 1 }}
          content={tipFor((r) => [
            ["Conversão", `${r.conversion.toFixed(2).replace(".", ",")}%`],
            ["Visitantes únicos", String(r.visitors)],
            ["Compradores", String(r.buyers)],
          ])}
        />
        <Line type="monotone" dataKey="conversion" stroke={INK} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#080808", strokeWidth: 2 }} />
      </LineChart>
    </Shell>
  );
}

export function TopProductsChart({ data }: { data: DashboardData["topProducts"] }) {
  const rows = data.map((d) => ({ ...d, short: d.name.length > 26 ? `${d.name.slice(0, 25)}…` : d.name }));
  return (
    <Shell data={rows} height={Math.max(180, rows.length * 44)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }} barCategoryGap="28%">
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="short"
          {...axisProps}
          width={190}
          tick={({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => (
            <text x={x} y={y} dy={4} textAnchor="end" fill="#a3a3a3" fontSize={12}>
              {payload.value}
            </text>
          )}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const r = payload[0].payload as (typeof rows)[number];
            return <TooltipBox title={r.name} rows={[["Unidades", String(r.quantity)], ["Receita", brlFull.format(r.revenue)]]} />;
          }}
        />
        <Bar dataKey="quantity" fill="#d4d4d4" radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: "right", fill: "#a3a3a3", fontSize: 11 }} />
      </BarChart>
    </Shell>
  );
}
