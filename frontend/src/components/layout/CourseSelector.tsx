import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createCourse, listCourses } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import type { Course } from "../../types";
import Select from "../ui/select";

export default function CourseSelector() {
  const activeCourseId = useAppStore((s) => s.activeCourseId);
  const setActiveCourseId = useAppStore((s) => s.setActiveCourseId);
  const [courses, setCourses] = useState<Course[]>([]);
  const [adding, setAdding] = useState(false);

  async function refresh() {
    try {
      setCourses(await listCourses());
    } catch {
      /* handled globally */
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreated(course: Course) {
    await refresh();
    setActiveCourseId(course.id);
  }

  return (
    <div className="px-3 pb-2 pt-4">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="label-mono text-[10px] font-semibold text-slate-500">
          Course
        </span>
        <button
          onClick={() => setAdding(true)}
          className="text-slate-500 transition-colors hover:text-white"
          title="New course"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <Select
        size="sm"
        ariaLabel="Active course"
        value={activeCourseId != null ? String(activeCourseId) : ""}
        onChange={(v) => setActiveCourseId(v ? Number(v) : undefined)}
        options={[
          { value: "", label: "All courses" },
          ...courses.map((c) => ({
            value: String(c.id),
            label: c.name,
            hint: c.semester ?? undefined,
          })),
        ]}
      />

      {adding && (
        <NewCourseModal
          onClose={() => setAdding(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

/** Themed replacement for the two window.prompt() calls that used to collect a new
 *  course. A single dialog takes the (required) name and an optional semester. */
function NewCourseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (course: Course) => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const course = await createCourse(
        name.trim(),
        semester.trim() || undefined
      );
      await onCreated(course);
      onClose();
    } catch {
      setError("Couldn't create the course. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="New course"
      onMouseDown={(e) => {
        // Click on the backdrop (not the card) dismisses.
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-6 shadow-card"
      >
        <h2 className="text-base font-bold text-foreground">New course</h2>
        <p className="mt-1 text-sm text-muted">
          Documents, quizzes, and analytics are organized per course.
        </p>

        <label className="mt-5 block">
          <span className="label-mono text-[10px] font-semibold text-slate-500">
            Course name
          </span>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Data Structures"
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-white/40"
          />
        </label>

        <label className="mt-4 block">
          <span className="label-mono text-[10px] font-semibold text-slate-500">
            Semester <span className="normal-case text-slate-600">(optional)</span>
          </span>
          <input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            placeholder="e.g. Fall 2026"
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-surface-2 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-white/40"
          />
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive-soft px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-white/10 bg-surface-2 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create course"}
          </button>
        </div>
      </form>
    </div>
  );
}
