import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimelinePoint } from "../../types";

export default function ScoreChart({ data }: { data: TimelinePoint[] }) {
  const rows = data.map((d, i) => ({
    idx: i + 1,
    score: d.score,
    label: new Date(d.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    student: d.student_name,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={rows} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.07)"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#8a8a92" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#8a8a92" }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            backgroundColor: "#17171b",
            fontSize: 12,
          }}
          labelStyle={{ color: "#ededed" }}
          itemStyle={{ color: "#ededed" }}
          formatter={(value: number) => [`${value}%`, "Score"]}
          labelFormatter={(_l, p: any) =>
            p?.[0]?.payload
              ? `${p[0].payload.student} · ${p[0].payload.label}`
              : ""
          }
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#e4e4e7"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#e4e4e7", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#ffffff" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
