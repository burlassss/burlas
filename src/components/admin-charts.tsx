"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function VolumeChart({ dados }: { dados: { dia: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={dados} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4dc" vertical={false} />
        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#717166" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#717166" }} axisLine={false} tickLine={false} width={44} />
        <Tooltip
          cursor={{ stroke: "#163c2b", strokeDasharray: "4 4" }}
          contentStyle={{ borderRadius: 16, border: "1px solid #e4e4dc", fontSize: 12, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
          formatter={(valor) => [`$${Number(valor ?? 0).toLocaleString("pt-MZ", { minimumFractionDigits: 2 })}`, "Depositado"]}
        />
        <Area type="monotone" dataKey="total" stroke="#163c2b" strokeWidth={3} fill="url(#limeGradient)" fillOpacity={1} />
        <defs>
          <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a9f44d" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#a9f44d" stopOpacity={0.05} />
          </linearGradient>
        </defs>
      </AreaChart>
    </ResponsiveContainer>
  );
}
