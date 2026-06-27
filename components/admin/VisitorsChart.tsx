"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { visitorsSeries } from "@/config/mock-data";

export function VisitorsChart() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fluid-0 text-text">Website Visitors</h3>
        <span className="text-fluid--1 text-text-faint">This Week</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={visitorsSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="visitorsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-gold)", borderRadius: 8 }}
              labelStyle={{ color: "var(--text-muted)" }}
            />
            <Area type="monotone" dataKey="visitors" stroke="var(--gold)" strokeWidth={2} fill="url(#visitorsFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
