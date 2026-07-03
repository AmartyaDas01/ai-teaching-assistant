import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Chat from "./pages/Chat";
import Documents from "./pages/Documents";
import Quiz from "./pages/Quiz";

// Code-split the analytics page so Recharts loads only when needed.
const Analytics = lazy(() => import("./pages/Analytics"));

export default function App() {
  return (
    <div className="flex h-full bg-slate-950 text-slate-900">
      <Sidebar />
      <div className="m-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-white to-slate-100 md:my-2 md:mr-2 md:rounded-2xl md:border md:border-slate-200 md:shadow-sm">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Loading…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Navigate to="/documents" replace />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
