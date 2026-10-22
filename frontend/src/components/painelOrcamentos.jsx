import { useEffect, useState } from "react";
import { listarOrcamentos } from "../services/orcamentos";
import "./PainelOrcamentos.css";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function mesAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function percentual(item) {
  const limite = Number(item.limite);

  return limite > 0
    ? (Number(item.comprometido) / limite) * 100
    : 0;
}

function situacao(item) {
  const consumo = percentual(item);

  if (consumo > 100) {
    return { classe: "excedido", texto: "Acima do limite" };
  }

  if (consumo === 100) {
    return { classe: "atencao", texto: "Limite atingido" };
  }

  if (consumo >= 80) {
    return { classe: "atencao", texto: "Próximo do limite" };
  }

  return { classe: "normal", texto: "Dentro do limite" };
}

export default function PainelOrcamentos() {
  const [mes, setMes] = useState(mesAtual);
  const [itens, setItens] = useState([]);
  const [versao, setVersao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    function atualizar() {
      setVersao((atual) => atual + 1);
    }

    window.addEventListener("orcamentos-atualizados", atualizar);
    window.addEventListener("lancamentos-atualizados", atualizar);

    return () => {
      window.removeEventListener("orcamentos-atualizados", atualizar);
      window.removeEventListener("lancamentos-atualizados", atualizar);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const resultado = await listarOrcamentos(
          `${mes}-01`,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setItens(
            [...resultado].sort(
              (a, b) =>
                percentual(b) - percentual(a) ||
                a.categoria_nome.localeCompare(b.categoria_nome),
            ),
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErro(
            error instanceof TypeError
              ? "Não foi possível acessar a API."
              : error.message || "Não foi possível carregar os limites.",
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
  }, [mes, versao]);

  const excedidos = itens.filter(
    (item) => Number(item.disponivel) < 0,
  ).length;

  const emAtencao = itens.filter((item) => {
    const consumo = percentual(item);

    return consumo >= 80 && consumo <= 100;
  }).length;

  return (
    <section
      className="painel-orcamentos"
      aria-labelledby="titulo-painel-orcamentos"
      aria-busy={carregando}
    >
      <div className="po-cabecalho">
        <div>
          <h2 id="titulo-painel-orcamentos">Seus limites do mês</h2>
          <p>As categorias mais comprometidas aparecem primeiro.</p>
        </div>

        <div className="po-controles">
          <label>
            Mês de competência
            <input
              type="month"
              min="1900-01"
              max="9999-12"
              value={mes}
              required
              onChange={(event) => {
                if (event.target.value && event.target.validity.valid) {
                  setMes(event.target.value);
                }
              }}
            />
          </label>

          <button
            type="button"
            disabled={carregando}
            onClick={() => setVersao((atual) => atual + 1)}
          >
            Atualizar
          </button>
        </div>
      </div>

      {carregando ? (
        <p className="po-vazio" role="status">
          Carregando limites...
        </p>
      ) : erro ? (
        <p className="po-erro" role="alert">
          {erro}
        </p>
      ) : itens.length === 0 ? (
        <p className="po-vazio">
          Nenhum limite definido neste mês. Use o botão Orçamentos
          na barra inferior para cadastrar.
        </p>
      ) : (
        <>
          <div className="po-indicadores">
            <div>
              <strong>{itens.length}</strong>
              <span>Categorias com limite</span>
            </div>

            <div>
              <strong>{emAtencao}</strong>
              <span>Com 80% a 100% comprometido</span>
            </div>

            <div>
              <strong>{excedidos}</strong>
              <span>Acima do limite</span>
            </div>
          </div>

          <ul className="po-lista">
            {itens.map((item) => {
              const consumo = percentual(item);
              const estado = situacao(item);
              const disponivel = Number(item.disponivel);

              return (
                <li key={item.id} className={`po-${estado.classe}`}>
                  <div className="po-linha">
                    <h3>{item.categoria_nome}</h3>
                    <span className="po-status">{estado.texto}</span>
                  </div>

                  <div className="po-valores">
                    <strong>
                      {moeda.format(Number(item.comprometido))}
                    </strong>
                    <span>de {moeda.format(Number(item.limite))}</span>
                  </div>

                  <div className="po-trilho" aria-hidden="true">
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, consumo))}%`,
                      }}
                    />
                  </div>

                  <div className="po-linha po-detalhes">
                    <span>
                      {consumo.toLocaleString("pt-BR", {
                        maximumFractionDigits: 1,
                      })}
                      % comprometido
                    </span>

                    <strong>
                      {disponivel < 0
                        ? `${moeda.format(Math.abs(disponivel))} acima`
                        : `${moeda.format(disponivel)} disponíveis`}
                    </strong>
                  </div>

                  <p className="po-composicao">
                    Pago: {moeda.format(Number(item.pago))}
                    {" · "}
                    Pendente: {moeda.format(Number(item.pendente))}
                  </p>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="po-nota">
        Considera somente categorias com orçamento cadastrado.
        Despesas pagas e pendentes comprometem o limite; canceladas não.
        Após copiar limites de outro mês, clique em Atualizar.
      </p>
    </section>
  );
}