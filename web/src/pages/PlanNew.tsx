import { Link } from "react-router-dom";

export default function PlanNew() {
  return (
    <div className="px-5 pt-6">
      <h1 className="mb-1 text-xl font-bold text-zinc-900">Novo plano de treino</h1>
      <p className="mb-6 text-sm text-zinc-500">
        O plano criado passa a valer para os dois. Escolha como quer montá-lo.
      </p>

      <div className="space-y-3">
        <Link
          to="/plano/colar"
          className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100 active:scale-[0.99]"
        >
          <p className="text-2xl">📋</p>
          <h2 className="mt-2 font-semibold text-zinc-900">Colar plano em texto</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Já tem um plano pronto (feito no ChatGPT, Claude ou por um personal)? Cole o texto e a
            IA organiza tudo.
          </p>
        </Link>

        <Link
          to="/plano/assistente"
          className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100 active:scale-[0.99]"
        >
          <p className="text-2xl">💬</p>
          <h2 className="mt-2 font-semibold text-zinc-900">Criar com assistente de IA</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Converse com a IA sobre seus objetivos. Ela já conhece seu histórico de treino e monta
            um plano novo com você.
          </p>
        </Link>
      </div>
    </div>
  );
}
