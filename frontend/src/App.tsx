import { Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Chat from "./pages/Chat";
import Documents from "./pages/Documents";

export default function App() {
  return (
    <div className="flex h-full bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<Navigate to="/documents" replace />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </div>
    </div>
  );
}
