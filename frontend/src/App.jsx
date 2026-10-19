import { useState } from "react";

import Dashboard from "./pages/dashboard";
import NovoLancamento from "./components/novoLancamento";
import Categorias from "./components/categorias";
import GerenciarLancamentos from "./components/gerenciarLancamentos";
import Recorrencias from "./components/recorrencias";
import ExportarLancamentos from "./components/exportarLancamentos";
import GastosPorCategoria from "./components/gastosPorCategoria";
import AgendaFinanceira from "./components/agendaFinanceira";
import EvolucaoMensal from "./components/evolucaoMensal";
import Orcamentos from "./components/orcamentos";

const estilos = `
  .financas-layout {
    min-height: 100dvh;
    padding: 24px 0 120px;
  }

  .financas-layout .barra-principal {
    box-sizing: border-box;
    width: fit-content;
    max-width: calc(100% - 24px);
    margin: 0 auto 24px;
    padding: 6px;
    border: 1px solid #dfe8e2;
    border-radius: 13px;
    background: #ffffff;
  }

  .financas-layout .secoes-principais {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .financas-layout .secoes-principais > button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    margin: 0;
    padding: 0 22px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #637970;
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      color 160ms ease;
  }

  .financas-layout .secoes-principais > button:hover {
    background: #edf5ef;
    color: #174f3e;
  }

  .financas-layout .secoes-principais > button[aria-pressed="true"] {
    background: #174f3e;
    color: #ffffff;
  }

  .financas-layout nav.acoes-financeiras {
    position: fixed;
    top: auto;
    right: auto;
    bottom: 18px;
    left: 50%;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
    gap: 8px;
    box-sizing: border-box;
    width: max-content;
    max-width: calc(100% - 24px);
    margin: 0;
    padding: 10px;
    border: 1px solid #d7e4dd;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 8px 30px #173c341a;
    transform: translateX(-50%);
  }

  .financas-layout nav.acoes-financeiras > button {
    position: static;
    inset: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    gap: 8px;
    box-sizing: border-box;
    width: auto;
    min-width: 0;
    min-height: 40px;
    height: auto;
    margin: 0;
    padding: 0 14px;
    border: 1px solid #dfe8e2;
    border-radius: 9px;
    background: #ffffff;
    color: #456457;
    box-shadow: none;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
    cursor: pointer;
    transform: none;
    transition:
      background-color 160ms ease,
      border-color 160ms ease;
  }

  .financas-layout nav.acoes-financeiras > button:hover {
    border-color: #b8cfc1;
    background: #f0f6f2;
    color: #174f3e;
    transform: none;
  }

  .financas-layout nav.acoes-financeiras > button:last-of-type {
    border-color: #174f3e;
    background: #174f3e;
    color: #ffffff;
  }

  .financas-layout nav.acoes-financeiras > button:last-of-type:hover {
    border-color: #22644f;
    background: #22644f;
  }

  .financas-layout .secoes-principais > button:focus-visible,
  .financas-layout nav.acoes-financeiras > button:focus-visible {
    outline: 2px solid #174f3e;
    outline-offset: 3px;
  }

  .financas-layout .pagina-financeira-titulo {
    box-sizing: border-box;
    width: calc(100% - 40px);
    max-width: 1160px;
    margin: 32px auto 24px;
  }

  .financas-layout .pagina-financeira-titulo h1 {
    margin: 0;
    color: #172b27;
    font-size: clamp(24px, 3vw, 32px);
    font-weight: 700;
    letter-spacing: -0.8px;
  }

  .financas-layout .pagina-financeira-titulo p {
    margin: 10px 0 0;
    color: #708178;
    font-size: 14px;
    line-height: 1.6;
  }

  .financas-layout .gastos-categorias {
    margin-bottom: 24px;
  }

  @media (max-width: 800px) {
    .financas-layout {
      padding-bottom: 170px;
    }

    .financas-layout nav.acoes-financeiras {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      width: min(540px, calc(100% - 24px));
    }

    .financas-layout nav.acoes-financeiras > button {
      width: 100%;
      padding: 0 8px;
      font-size: 12px;
    }
  }

  @media (max-width: 500px) {
    .financas-layout {
      padding-top: 12px;
      padding-bottom: 220px;
    }

    .financas-layout .secoes-principais > button {
      min-width: 0;
      padding: 0 16px;
      font-size: 13px;
    }

    .financas-layout nav.acoes-financeiras {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .financas-layout .pagina-financeira-titulo {
      width: calc(100% - 24px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .financas-layout .secoes-principais > button,
    .financas-layout nav.acoes-financeiras > button {
      transition: none;
    }
  }
`;

const paginas = [
  { id: "resumo", nome: "Resumo" },
  { id: "agenda", nome: "Agenda" },
  { id: "analises", nome: "Análises" },
];

export default function App() {
  const [pagina, setPagina] = useState("resumo");

  return (
    <div className="financas-layout">
      <style>{estilos}</style>

      <div className="barra-principal">
        <nav
          className="secoes-principais"
          aria-label="Seções do sistema"
        >
          {paginas.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={pagina === item.id}
              aria-controls="conteudo-financeiro"
              onClick={() => setPagina(item.id)}
            >
              {item.nome}
            </button>
          ))}
        </nav>
      </div>

      <div id="conteudo-financeiro">
        {pagina === "resumo" && <Dashboard />}

        {pagina === "agenda" && (
          <>
            <header className="pagina-financeira-titulo">
              <h1>Sua agenda</h1>
              <p>Acompanhe pagamentos e recebimentos pendentes.</p>
            </header>

            <AgendaFinanceira />
          </>
        )}

        {pagina === "analises" && (
          <>
            <header className="pagina-financeira-titulo">
              <h1>Suas finanças em números</h1>
              <p>Compare os meses e os gastos por categoria.</p>
            </header>

            <EvolucaoMensal />
            <GastosPorCategoria />
          </>
        )}
      </div>

      <nav
        className="acoes-financeiras"
        aria-label="Ações financeiras"
      >
        <Categorias />
        <GerenciarLancamentos />
        <Recorrencias />
        <Orcamentos />
        <ExportarLancamentos />
        <NovoLancamento />
      </nav>
    </div>
  );
}