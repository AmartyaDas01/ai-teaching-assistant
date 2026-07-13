import type { HeatmapCell, HeatmapTopic } from "../../types";

interface TopicHeatmapProps {
  students: string[];
  topics: HeatmapTopic[];
  cells: HeatmapCell[];
}

function scoreColor(score: number): string {
  // 0 -> red (hue 0), 100 -> green (hue ~130)
  const hue = Math.round((score / 100) * 130);
  return `hsl(${hue}, 65%, 45%)`;
}

export default function TopicHeatmap({
  students,
  topics,
  cells,
}: TopicHeatmapProps) {
  const lookup = new Map<string, number>();
  for (const c of cells) lookup.set(`${c.student}|${c.quiz_id}`, c.score);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-32 text-left font-medium text-muted">Student</th>
            {topics.map((t) => (
              <th
                key={t.quiz_id}
                className="px-1 text-center font-medium text-muted"
                title={t.title}
              >
                Q{t.quiz_id}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student}>
              <td className="max-w-32 truncate pr-2 font-medium text-slate-200">
                {student}
              </td>
              {topics.map((t) => {
                const score = lookup.get(`${student}|${t.quiz_id}`);
                return (
                  <td key={t.quiz_id} className="p-0">
                    {score === undefined ? (
                      <div className="flex h-9 items-center justify-center rounded-md bg-white/5 text-slate-600">
                        –
                      </div>
                    ) : (
                      <div
                        className="flex h-9 items-center justify-center rounded-md font-semibold text-white"
                        style={{ backgroundColor: scoreColor(score) }}
                        title={`${student} · ${t.title}: ${score}%`}
                      >
                        {score}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
        <span>Weak</span>
        <span
          className="h-2 w-24 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, hsl(0,65%,45%), hsl(65,65%,45%), hsl(130,65%,45%))",
          }}
        />
        <span>Strong</span>
      </div>
    </div>
  );
}
