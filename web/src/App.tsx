import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Exercises from "./pages/Exercises";
import Home from "./pages/Home";
import LiveWorkout from "./pages/LiveWorkout";
import Login from "./pages/Login";
import PlanChat from "./pages/PlanChat";
import PlanNew from "./pages/PlanNew";
import PlanPaste from "./pages/PlanPaste";
import PlanReview from "./pages/PlanReview";
import Progress from "./pages/Progress";

function ProtectedArea() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400">Carregando…</div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/treino/ao-vivo" element={<LiveWorkout />} />
        <Route path="/plano/novo" element={<PlanNew />} />
        <Route path="/plano/colar" element={<PlanPaste />} />
        <Route path="/plano/assistente" element={<PlanChat />} />
        <Route path="/plano/revisar" element={<PlanReview />} />
        <Route path="/evolucao" element={<Progress />} />
        <Route path="/exercicios" element={<Exercises />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedArea />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
