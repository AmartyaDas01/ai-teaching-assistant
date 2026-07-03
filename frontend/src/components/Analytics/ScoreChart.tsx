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
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
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
          stroke="#4f46e5"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#4f46e5", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
