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

// Hex mirror of BLOOM_META dot colors (Recharts needs concrete colors, not classes).
// Brightened to the 400 ramp so each bar reads on the near-black surface; identity is
// also carried by the x-axis labels (L1·Remember …), so color is never the sole cue.
const BLOOM_FILL: Record<string, string> = {
  L1: "#38bdf8",
  L2: "#34d399",
  L3: "#2dd4bf",
  L4: "#fbbf24",
  L5: "#fb923c",
  L6: "#e879f9",
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
          tick={{ fontSize: 11, fill: "#8a8a92" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
          interval={0}
          angle={-12}
          textAnchor="end"
          height={50}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#8a8a92" }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.06)" }}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            backgroundColor: "#17171b",
            fontSize: 12,
          }}
          labelStyle={{ color: "#ededed" }}
          itemStyle={{ color: "#ededed" }}
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
