import { useEffect, useRef, useState } from "react";

type Props = {
  seconds: number;
  onClose: () => void;
};

/** Timer de descanso opcional: contagem visual + vibração quando termina. */
export default function RestTimer({ seconds, onClose }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setFinished(true);
          if (typeof navigator.vibrate === "function") {
            navigator.vibrate([300, 100, 300, 100, 300]);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-md px-4">
      <div
        className={`flex items-center justify-between rounded-2xl p-4 shadow-lg ring-1 ${
          finished ? "animate-pulse bg-brand-600 ring-brand-700" : "bg-zinc-900 ring-zinc-800"
        }`}
      >
        <div className="text-white">
          <p className="text-xs uppercase tracking-wide text-zinc-300">
            {finished ? "Descanso terminou!" : "Descansando…"}
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {mins}:{secs.toString().padStart(2, "0")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRemaining((r) => r + 15)}
            className="rounded-full bg-white/10 px-3 py-2 text-sm text-white"
          >
            +15s
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-2 text-sm text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
