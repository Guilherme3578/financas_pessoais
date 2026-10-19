import { useEffect, useState } from "react";
import { consultarApi } from "../services/api";
import "./EvolucaoMensal.css";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function mesAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function ultimosMeses(mesFinal) {
  const [ano, mes] = mesFinal.split("-").map(Number);

  return Array.from({ length: 6 }, (_, indice) => {
    const data = new Date(ano, mes - 1 - (5 - indice), 1, 12);
    const anoMes = data.getFullYear();
    const numeroMes = data.getMonth() + 1;
    const prefixo = `${anoMes}-${String(numeroMes).padStart(2, "0")}`;
    const ultimoDia = new Date(anoMes, numeroMes, 0).getDate();

    return {
      chave: prefixo,
      nome: data.toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
      }),
      data_inicio: `${prefixo}-01`,
      data_fim: `${prefixo}-${ultimoDia}`,
    };
  });
}

export default function EvolucaoMensal() {
  const [mesFinal, setMesFinal] = useState(mesAtual);
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
        const meses = ultimosMeses(mesFinal);

        const resultado = await Promise.all(
          meses.map(async (mes) => {
            const resumo = await consultarApi(
              "/dashboard/resumo",
              {
                data_inicio: mes.data_inicio,
                data_fim: mes.data_fim,
              },
              controller.signal,
            );

            return {
              ...mes,
              receitas: Number(resumo.receitas_efetivadas),
              despesas: Number(resumo.despesas_efetivadas),
              resultado: Number(resumo.saldo_realizado),
            };
          }),
        );

        if (!controller.signal.aborted) {
          setDados(resultado);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErro(
            error instanceof TypeError
              ? "Não foi possível acessar a API."
              : error.message || "Não foi possível carregar a evolução.",
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
  }, [mesFinal, versao]);

  const maiorValor = Math.max(
    1,
    ...dados.flatMap((item) => [item.receitas, item.despesas]),
  );

  const temMovimento = dados.some(
    (item) => item.receitas > 0 || item.despesas > 0,
  );

  return (
    <section
      className="evolucao-mensal"
      aria-labelledby="titulo-evolucao"
      aria-busy={carregando}
    >
      <div className="evolucao-cabecalho">
        <div>
          <h2 id="titulo-evolucao">Evolução mensal</h2>
          <p>Compare o que entrou e saiu em cada mês.</p>
        </div>

        <label className="evolucao-filtro">
          Mês
          <input
            type="month"
            value={mesFinal}
            min="1900-06"
            max="9999-12"
            required
            onChange={(event) => {
              if (event.target.value && event.target.validity.valid) {
                setMesFinal(event.target.value);
              }
            }}
          />
        </label>
      </div>

      {carregando ? (
        <p className="evolucao-vazio" role="status">
          Carregando evolução...
        </p>
      ) : erro ? (
        <div className="evolucao-erro" role="alert">
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
          {temMovimento ? (
            <>
              <div className="evolucao-legenda">
                <span>
                  <i className="evolucao-cor-receita" />
                  Recebido
                </span>
                <span>
                  <i className="evolucao-cor-despesa" />
                  Pago
                </span>
              </div>

              <div className="evolucao-grafico-scroll" aria-hidden="true">
                <div className="evolucao-grafico">
                  {dados.map((item) => (
                    <div className="evolucao-coluna" key={item.chave}>
                      <div className="evolucao-barras">
                        <div
                          className="evolucao-barra evolucao-cor-receita"
                          style={{
                            height: `${(item.receitas / maiorValor) * 100}%`,
                          }}
                          title={`Recebido: ${moeda.format(item.receitas)}`}
                        />

                        <div
                          className="evolucao-barra evolucao-cor-despesa"
                          style={{
                            height: `${(item.despesas / maiorValor) * 100}%`,
                          }}
                          title={`Pago: ${moeda.format(item.despesas)}`}
                        />
                      </div>

                      <span>{item.nome}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="evolucao-vazio">
              Nenhum pagamento ou recebimento registrado nesse período.
            </p>
          )}

          <div
            className="evolucao-tabela-scroll"
            role="region"
            aria-label="Valores da evolução mensal"
            tabIndex={0}
          >
            <table className="evolucao-tabela">
              <caption className="evolucao-somente-leitor">
                Receitas recebidas, despesas pagas e resultado por mês
              </caption>

              <thead>
                <tr>
                  <th scope="col">Mês</th>
                  <th scope="col">Recebido</th>
                  <th scope="col">Pago</th>
                  <th scope="col">Resultado</th>
                </tr>
              </thead>

              <tbody>
                {dados.map((item) => (
                  <tr key={item.chave}>
                    <th scope="row">{item.nome}</th>
                    <td>{moeda.format(item.receitas)}</td>
                    <td>{moeda.format(item.despesas)}</td>
                    <td
                      className={
                        item.resultado < 0
                          ? "evolucao-negativo"
                          : "evolucao-positivo"
                      }
                    >
                      {moeda.format(item.resultado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="evolucao-nota">
        Valores agrupados pelo mês de competência. Apenas lançamentos
        efetivados entram no cálculo. O resultado é a diferença entre
        receitas e despesas do mês, sem saldo anterior.
      </p>
    </section>
  );
}