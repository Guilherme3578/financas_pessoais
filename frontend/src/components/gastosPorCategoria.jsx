import { useEffect, useState } from "react";
import { consultarApi } from "../services/api";
import { listarCategorias } from "../services/categorias";
import "./GastosPorCategoria.css";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function mesAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function periodo(mes) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, numeroMes, 0).getDate();

  return {
    competencia_inicio: `${mes}-01`,
    competencia_fim: `${mes}-${ultimoDia}`,
  };
}

function centavos(valor) {
  const [inteiro, decimal = ""] = String(valor).split(".");

  return Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
}

export default function GastosPorCategoria() {
  const [mes, setMes] = useState(mesAtual);
  const [situacao, setSituacao] = useState("efetivado");
  const [versao, setVersao] = useState(0);
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    function atualizar() {
      setVersao((atual) => atual + 1);
    }

    window.addEventListener("lancamentos-atualizados", atualizar);

    return () => {
      window.removeEventListener("lancamentos-atualizados", atualizar);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const categorias = await listarCategorias(controller.signal);
        const nomes = new Map(
          categorias.map((categoria) => [categoria.id, categoria.nome]),
        );

        const totais = new Map();
        let offset = 0;

        while (true) {
          const pagina = await consultarApi(
            "/lancamentos",
            {
              ...periodo(mes),
              tipo: "despesa",
              status: situacao === "todos" ? "" : situacao,
              offset,
              limit: 100,
            },
            controller.signal,
          );

          for (const item of pagina) {
            if (item.status === "cancelado") continue;

            const acumulado = totais.get(item.categoria_id) ?? 0;

            totais.set(
              item.categoria_id,
              acumulado + centavos(item.valor),
            );
          }

          if (pagina.length < 100) break;

          offset += 100;
        }

        const resultado = Array.from(totais, ([id, valor]) => ({
          id,
          nome: nomes.get(id) ?? `Categoria ${id}`,
          valor,
        })).sort(
          (a, b) => b.valor - a.valor || a.nome.localeCompare(b.nome),
        );

        if (!controller.signal.aborted) {
          setDados(resultado);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErro(
            error instanceof TypeError
              ? "Não foi possível acessar a API."
              : error.message || "Não foi possível carregar as categorias.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => controller.abort();
  }, [mes, situacao, versao]);

  const total = dados.reduce((soma, item) => soma + item.valor, 0);

  const tituloTotal = {
    efetivado: "Total pago",
    pendente: "Total pendente",
    todos: "Total pago e pendente",
  }[situacao];

  return (
    <section
      className="gastos-categorias"
      aria-labelledby="titulo-gastos-categorias"
      aria-busy={carregando}
    >
      <div className="gastos-categorias-cabecalho">
        <div>
          <h2 id="titulo-gastos-categorias">Gastos por categoria</h2>
          <p>Veja onde seu dinheiro está indo.</p>
        </div>

        <div className="gastos-categorias-filtros">
          <label>
            Mês de competência
            <input
              type="month"
              value={mes}
              min="1900-01"
              max="9999-12"
              onChange={(event) => {
                if (event.target.validity.valid && event.target.value) {
                  setMes(event.target.value);
                }
              }}
              required
            />
          </label>

          <label>
            Despesas
            <select
              value={situacao}
              onChange={(event) => setSituacao(event.target.value)}
            >
              <option value="efetivado">Pagas</option>
              <option value="pendente">Pendentes</option>
              <option value="todos">Pagas e pendentes</option>
            </select>
          </label>
        </div>
      </div>

      {carregando ? (
        <p className="gastos-categorias-vazio" role="status">
          Carregando gastos...
        </p>
      ) : erro ? (
        <div className="gastos-categorias-erro" role="alert">
          <p>{erro}</p>
          <button
            type="button"
            onClick={() => setVersao((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : dados.length === 0 ? (
        <p className="gastos-categorias-vazio">
          Nenhuma despesa encontrada para esse filtro.
        </p>
      ) : (
        <>
          <div className="gastos-categorias-total">
            <span>{tituloTotal}</span>
            <strong>{moeda.format(total / 100)}</strong>
          </div>

          <ul className="gastos-categorias-lista">
            {dados.map((item) => {
              const percentual = total > 0 ? (item.valor / total) * 100 : 0;

              return (
                <li key={item.id}>
                  <div className="gastos-categorias-linha">
                    <span>{item.nome}</span>

                    <div className="gastos-categorias-valores">
                      <strong>{moeda.format(item.valor / 100)}</strong>
                      <small>
                        {percentual.toLocaleString("pt-BR", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}
                        %
                      </small>
                    </div>
                  </div>

                  <div
                    className="gastos-categorias-trilho"
                    aria-hidden="true"
                  >
                    <div style={{ width: `${percentual}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="gastos-categorias-nota">
        Este quadro tem seu próprio filtro de mês. Despesas canceladas não
        entram no cálculo.
      </p>
    </section>
  );
}