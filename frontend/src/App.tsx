import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Chat from "./pages/Chat";
import Documents from "./pages/Documents";
import Login from "./pages/Login";
import Quiz from "./pages/Quiz";
import Settings from "./pages/Settings";
import Verify from "./pages/Verify";
import { useAppStore } from "./store/useAppStore";

// Code-split the analytics page so Recharts loads only when needed.
const Analytics = lazy(() => import("./pages/Analytics"));

export default function App() {
  const token = useAppStore((s) => s.token);
  const logout = useAppStore((s) => s.logout);

  // React to 401s dispatched from the axios interceptor.
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [logout]);

  if (!token) {
    // The emailed confirmation link lands here while signed out, so it must resolve
    // to the verify page rather than being swallowed by the login screen.
    if (window.location.pathname === "/verify") return <Verify />;
    return <Login />;
  }

  return (
    <div className="flex h-full bg-[#050505] text-foreground">
      <Sidebar />
      <div className="m-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#0d0d0f] to-[#050505] md:my-2 md:mr-2 md:rounded-2xl md:border md:border-white/10 md:shadow-sm">
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
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/documents" replace />} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
}
