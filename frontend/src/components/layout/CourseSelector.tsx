import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createCourse, listCourses } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import type { Course } from "../../types";

export default function CourseSelector() {
  const activeCourseId = useAppStore((s) => s.activeCourseId);
  const setActiveCourseId = useAppStore((s) => s.setActiveCourseId);
  const [courses, setCourses] = useState<Course[]>([]);

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

  async function addCourse() {
    const name = window.prompt("New course name (e.g. Data Structures)");
    if (!name?.trim()) return;
    const semester = window.prompt("Semester (optional, e.g. Fall 2026)") ?? undefined;
    const course = await createCourse(name.trim(), semester?.trim() || undefined);
    await refresh();
    setActiveCourseId(course.id);
  }

  return (
    <div className="px-3 pb-2 pt-4">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          Course
        </span>
        <button
          onClick={addCourse}
          className="text-slate-500 transition-colors hover:text-white"
          title="New course"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <select
        value={activeCourseId ?? ""}
        onChange={(e) =>
          setActiveCourseId(e.target.value ? Number(e.target.value) : undefined)
        }
        className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-400"
      >
        <option value="" className="bg-slate-900">
          All courses
        </option>
        {courses.map((c) => (
          <option key={c.id} value={c.id} className="bg-slate-900">
            {c.name}
            {c.semester ? ` · ${c.semester}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
