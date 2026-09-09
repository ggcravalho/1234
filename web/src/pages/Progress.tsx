import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { Exercise, ExerciseHistoryPoint, User } from "../types";

export default function Progress() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setSelectedUserId(user.id);
    api.get<{ users: User[] }>("/users").then((res) => setUsers(res.users));
  }, [user]);

  useEffect(() => {
    if (!selectedUserId) return;
    api
      .get<{ exercises: Exercise[] }>(`/progress/exercises?userId=${selectedUserId}`)
      .then((res) => {
        setExercises(res.exercises);
        setSelectedExerciseId((current) =>
          res.exercises.some((e) => e.id === current) ? current : (res.exercises[0]?.id ?? ""),
        );
      });
  }, [selectedUserId]);

  useEffect(() => {
    if (!selectedUserId || !selectedExerciseId) {
      setHistory([]);
      return;
    }
    setLoading(true);
    api
      .get<{ history: ExerciseHistoryPoint[] }>(
        `/progress/${selectedExerciseId}?userId=${selectedUserId}`,
      )
      .then((res) => setHistory(res.history))
      .finally(() => setLoading(false));
  }, [selectedUserId, selectedExerciseId]);

  const chartData = useMemo(
    () =>
      history.map((h) => ({
        date: new Date(h.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        carga: h.maxLoadKg,
        volume: Math.round(h.volume),
        isPr: h.isPr,
      })),
    [history],
  );

  const prCount = history.filter((h) => h.isPr).length;
  const lastPoint = history[history.length - 1];

  return (
    <div className="px-5 pt-6">
      <h1 className="mb-4 text-xl font-bold text-zinc-900">Evolução</h1>

      <div className="mb-4 flex gap-2">
        {users.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => setSelectedUserId(u.id)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium ${
              selectedUserId === u.id
                ? "bg-brand-600 text-white"
                : "bg-white text-zinc-500 ring-1 ring-zinc-200"
            }`}
          >
            {u.id === user?.id ? "Meus dados" : u.name}
          </button>
        ))}
      </div>

      <select
        value={selectedExerciseId}
        onChange={(e) => setSelectedExerciseId(e.target.value)}
        className="mb-4 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
      >
        {exercises.length === 0 && <option value="">Sem histórico ainda</option>}
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </select>

      {loading && <p className="text-center text-zinc-400">Carregando…</p>}

      {!loading && history.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-700">Carga máxima (kg)</p>
              {lastPoint?.isPr && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  🏆 Novo PR!
                </span>
              )}
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="carga"
                    stroke="#dd4f18"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload, index } = props;
                      return (
                        <circle
                          key={index}
                          cx={cx}
                          cy={cy}
                          r={payload.isPr ? 5 : 3}
                          fill={payload.isPr ? "#f2662d" : "#dd4f18"}
                          stroke={payload.isPr ? "#fff" : "none"}
                          strokeWidth={payload.isPr ? 2 : 0}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {prCount} recorde(s) pessoal(is) nesse exercício.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <p className="mb-2 text-sm font-semibold text-zinc-700">
              Volume (séries × reps × carga)
            </p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#71717a"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!loading && exercises.length > 0 && history.length === 0 && (
        <p className="text-center text-zinc-400">Sem registros para esse exercício ainda.</p>
      )}
      {!loading && exercises.length === 0 && (
        <p className="text-center text-zinc-400">
          Nenhum exercício registrado ainda. Complete um treino para ver a evolução aqui.
        </p>
      )}
    </div>
  );
}
