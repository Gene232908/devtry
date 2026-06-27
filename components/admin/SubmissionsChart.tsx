"use client";

import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, YAxis } from "recharts";
import { Card } from "@/components/ui/Card";
import { submissionsSeries } from "@/config/mock-data";

export function SubmissionsChart() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-fluid-0 text-text">Car Submissions</h3>
        <span className="text-fluid--1 text-text-faint">New Submissions</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={submissionsSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" stroke="var(--text-faint)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border-gold)", borderRadius: 8 }}
              labelStyle={{ color: "var(--text-muted)" }}
              cursor={{ fill: "rgba(212,175,55,.08)" }}
            />
            <Bar dataKey="submissions" fill="var(--gold)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
