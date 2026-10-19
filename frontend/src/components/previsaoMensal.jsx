import { useEffect, useState } from "react";
import { consultarApi } from "../services/api";
import "./PrevisaoMensal.css";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function mesAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function nomeMes(competencia) {
  const [ano, mes] = competencia.split("-").map(Number);

  return new Date(ano, mes - 1, 1, 12).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
}

function centavos(valor) {
  const texto = String(valor);
  const negativo = texto.startsWith("-");
  const [inteiro, decimal = ""] = texto.replace(/^-/, "").split(".");
  const resultado = Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));

  return negativo ? -resultado : resultado;
}

export default function PrevisaoMensal() {
  const [inicio, setInicio] = useState(mesAtual);
  const [meses, setMeses] = useState(6);
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
        const resultado = await consultarApi(
          "/previsoes/mensal",
          {
            inicio: `${inicio}-01`,
            meses,
          },
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setDados(resultado);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErro(
            error instanceof TypeError
              ? "Não foi possível acessar a API."
              : error.message || "Não foi possível carregar a previsão.",
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
  }, [inicio, meses, versao]);

  const receitas = dados.reduce(
    (total, item) => total + centavos(item.receitas_previstas),
    0,
  );

  const despesas = dados.reduce(
    (total, item) => total + centavos(item.despesas_previstas),
    0,
  );

  const resultado = receitas - despesas;

  const mesesNegativos = dados.filter(
    (item) => centavos(item.resultado_previsto) < 0,
  ).length;

  return (
    <section
      className="previsao-mensal"
      aria-labelledby="titulo-previsao"
      aria-busy={carregando}
    >
      <div className="previsao-cabecalho">
        <div>
          <h2 id="titulo-previsao">Previsão dos próximos meses</h2>
          <p>Veja o que já está previsto entrar e sair.</p>
        </div>

        <div className="previsao-filtros">
          <label>
            A partir de
            <input
              type="month"
              value={inicio}
              min="1900-01"
              max="9998-12"
              required
              onChange={(event) => {
                if (event.target.value && event.target.validity.valid) {
                  setInicio(event.target.value);
                }
              }}
            />
          </label>

          <label>
            Período
            <select
              value={meses}
              onChange={(event) => setMeses(Number(event.target.value))}
            >
              <option value={3}>3 meses</option>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </label>
        </div>
      </div>

      {carregando ? (
        <p className="previsao-vazio" role="status">
          Carregando previsão...
        </p>
      ) : erro ? (
        <div className="previsao-erro" role="alert">
          <p>{erro}</p>

          <button
            type="button"
            onClick={() => setVersao((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="previsao-resumo">
            <div>
              <span>Entradas no período</span>
              <strong>{moeda.format(receitas / 100)}</strong>
            </div>

            <div>
              <span>Saídas no período</span>
              <strong>{moeda.format(despesas / 100)}</strong>
            </div>

            <div>
              <span>Resultado previsto</span>
              <strong
                className={
                  resultado < 0 ? "previsao-negativo" : "previsao-positivo"
                }
              >
                {moeda.format(resultado / 100)}
              </strong>
            </div>
          </div>

          {mesesNegativos > 0 && (
            <p className="previsao-alerta">
              {mesesNegativos === 1
                ? "Há 1 mês com despesas previstas maiores que as receitas."
                : `Há ${mesesNegativos} meses com despesas previstas maiores que as receitas.`}
            </p>
          )}

          <div
            className="previsao-tabela-scroll"
            role="region"
            aria-label="Previsão financeira por mês"
            tabIndex={0}
          >
            <table className="previsao-tabela">
              <thead>
                <tr>
                  <th scope="col">Mês</th>
                  <th scope="col">Entradas previstas</th>
                  <th scope="col">Saídas previstas</th>
                  <th scope="col">Resultado</th>
                </tr>
              </thead>

              <tbody>
                {dados.map((item) => {
                  const saldo = centavos(item.resultado_previsto);

                  return (
                    <tr key={item.competencia}>
                      <th scope="row">{nomeMes(item.competencia)}</th>

                      <td>
                        <strong>
                          {moeda.format(
                            centavos(item.receitas_previstas) / 100,
                          )}
                        </strong>
                        <small>
                          A receber:{" "}
                          {moeda.format(
                            centavos(item.receitas_pendentes) / 100,
                          )}
                        </small>
                      </td>

                      <td>
                        <strong>
                          {moeda.format(
                            centavos(item.despesas_previstas) / 100,
                          )}
                        </strong>
                        <small>
                          A pagar:{" "}
                          {moeda.format(
                            centavos(item.despesas_pendentes) / 100,
                          )}
                        </small>
                      </td>

                      <td
                        className={
                          saldo < 0 ? "previsao-negativo" : "previsao-positivo"
                        }
                      >
                        <strong>{moeda.format(saldo / 100)}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {receitas === 0 && despesas === 0 && (
            <p className="previsao-vazio">
              Nenhum valor previsto nesse período. Cadastre lançamentos
              ou gere os próximos meses das suas recorrências.
            </p>
          )}
        </>
      )}

      <p className="previsao-nota">
        Considera lançamentos efetivados e pendentes por mês de competência.
        Recorrências só entram após gerar os lançamentos. Não inclui saldo
        bancário anterior nem despesas ainda não cadastradas.
      </p>
    </section>
  );
}