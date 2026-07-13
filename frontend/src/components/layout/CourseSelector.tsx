import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { createCourse, listCourses } from "../../services/api";
import { useAppStore } from "../../store/useAppStore";
import type { Course } from "../../types";
import Select from "../ui/select";

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
        <span className="label-mono text-[10px] font-semibold text-slate-500">
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
    </div>
  );
}
