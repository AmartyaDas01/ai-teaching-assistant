import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Chat from "./pages/Chat";
import Documents from "./pages/Documents";

export default function App() {
  return (
    <div className="flex h-full bg-slate-950 text-slate-900">
      <Sidebar />
      <div className="m-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-white to-slate-100 md:my-2 md:mr-2 md:rounded-2xl md:border md:border-slate-200 md:shadow-sm">
        <Routes>
          <Route path="/" element={<Navigate to="/documents" replace />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </div>
    </div>
  );
}
