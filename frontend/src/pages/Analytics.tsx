import {
  BarChart3,
  FileText,
  Loader2,
  Target,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import BloomsDistribution from "../components/Analytics/BloomsDistribution";
import ScoreChart from "../components/Analytics/ScoreChart";
import TopicHeatmap from "../components/Analytics/TopicHeatmap";
import Navbar from "../components/layout/Navbar";
import { getAnalytics } from "../services/api";
import type { AnalyticsOverview } from "../types";

export default function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(() => setError("Could not load analytics. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar
        title="Analytics"
        subtitle="Student performance & weak-area insights"
      />
      <div className="scroll-slim flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading analytics…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : !data || data.num_attempts === 0 ? (
          <EmptyState hasQuizzes={(data?.num_quizzes ?? 0) > 0} />
        ) : (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Average score"
                value={`${data.avg_score}%`}
                tint="text-emerald-400 bg-emerald-500/10"
              />
              <StatCard
                icon={<Target className="h-5 w-5" />}
                label="Quiz attempts"
                value={data.num_attempts}
                tint="text-foreground bg-white/10"
              />
              <StatCard
                icon={<BarChart3 className="h-5 w-5" />}
                label="Quizzes"
                value={data.num_quizzes}
                tint="text-fuchsia-400 bg-fuchsia-500/10"
              />
              <StatCard
                icon={<FileText className="h-5 w-5" />}
                label="Documents"
                value={data.num_documents}
                tint="text-amber-400 bg-amber-500/10"
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Panel
                title="Scores over time"
                subtitle="Each quiz attempt, most recent last"
              >
                <ScoreChart data={data.score_timeline} />
              </Panel>
              <Panel
                title="Bloom's mastery"
                subtitle="Accuracy by cognitive level — spot weak areas"
              >
                <BloomsDistribution data={data.bloom_performance} />
              </Panel>
            </div>

            <Panel
              title="Weak-area heatmap"
              subtitle="Average score per student across quizzes"
            >
              <TopicHeatmap
                students={data.heatmap_students}
                topics={data.heatmap_topics}
                cells={data.heatmap_cells}
              />
            </Panel>
          </div>
        )}
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface p-4 shadow-card">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}
      >
        {icon}
      </div>
      <div className="text-2xl font-extrabold text-slate-100">{value}</div>
      <div className="label-mono text-[11px] text-muted">{label}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-5 shadow-card">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ hasQuizzes }: { hasQuizzes: boolean }) {
  return (
    <div className="bg-dotted flex flex-col items-center rounded-xl border border-white/10 py-20 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-card ring-1 ring-white/10">
        <BarChart3 className="h-6 w-6 text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-200">No attempts yet</p>
      <p className="mt-1 max-w-xs text-xs text-muted">
        {hasQuizzes
          ? "Take a quiz on the Quiz Generator page to see performance analytics here."
          : "Generate a quiz, take it, and analytics will appear here."}
      </p>
    </div>
  );
}
