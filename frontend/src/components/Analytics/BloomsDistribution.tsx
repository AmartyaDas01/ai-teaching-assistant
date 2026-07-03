import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BloomPerformance } from "../../types";

// Hex mirror of BLOOM_META dot colors (Recharts needs concrete colors, not classes)
const BLOOM_FILL: Record<string, string> = {
  L1: "#0ea5e9",
  L2: "#10b981",
  L3: "#14b8a6",
  L4: "#f59e0b",
  L5: "#f97316",
  L6: "#d946ef",
};

export default function BloomsDistribution({
  data,
}: {
  data: BloomPerformance[];
}) {
  const rows = data.map((d) => ({
    label: `${d.level} · ${d.name}`,
    level: d.level,
    accuracy: d.accuracy,
    correct: d.correct,
    total: d.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          interval={0}
          angle={-12}
          textAnchor="end"
          height={50}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
          formatter={(value: number, _n, item: any) => [
            `${value}% (${item.payload.correct}/${item.payload.total})`,
            "Accuracy",
          ]}
        />
        <Bar dataKey="accuracy" radius={[6, 6, 0, 0]} maxBarSize={64}>
          {rows.map((r) => (
            <Cell key={r.level} fill={BLOOM_FILL[r.level] ?? "#6366f1"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
