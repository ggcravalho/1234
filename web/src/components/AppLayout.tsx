import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/", label: "Treino", icon: "🏋️" },
  { to: "/evolucao", label: "Evolução", icon: "📈" },
  { to: "/exercicios", label: "Exercícios", icon: "📋" },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-zinc-50">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav className="safe-bottom fixed bottom-0 w-full max-w-md border-t border-zinc-200 bg-white/95 backdrop-blur">
        <ul className="flex justify-around">
          {NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                    isActive ? "text-brand-600" : "text-zinc-400"
                  }`
                }
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
