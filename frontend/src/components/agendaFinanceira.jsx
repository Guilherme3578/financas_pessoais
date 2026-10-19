import { useEffect, useState } from "react";
import { consultarApi } from "../services/api";
import "./AgendaFinanceira.css";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function dataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function hojeLocal() {
  return dataLocal(new Date());
}

function adicionarDias(data, quantidade) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const resultado = new Date(ano, mes - 1, dia, 12);

  resultado.setDate(resultado.getDate() + quantidade);

  return dataLocal(resultado);
}

function formatarData(data) {
  return data.split("-").reverse().join("/");
}

function centavos(valor) {
  const [inteiro, decimal = ""] = String(valor).split(".");

  return Number(inteiro) * 100 + Number(decimal.padEnd(2, "0"));
}

export default function AgendaFinanceira() {
  const [hoje, setHoje] = useState(hojeLocal);
  const [aba, setAba] = useState("atrasados");
  const [tipo, setTipo] = useState("");
  const [versao, setVersao] = useState(0);
  const [itens, setItens] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    function atualizar() {
      setHoje(hojeLocal());
      setVersao((atual) => atual + 1);
      setPagina(0);
    }

    function conferirData() {
      setHoje(hojeLocal());
    }

    const intervalo = window.setInterval(conferirData, 60000);

    window.addEventListener("lancamentos-atualizados", atualizar);
    window.addEventListener("focus", conferirData);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("lancamentos-atualizados", atualizar);
      window.removeEventListener("focus", conferirData);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const resultado = [];
        let offset = 0;

        while (true) {
          const paginaApi = await consultarApi(
            "/lancamentos",
            {
              status: "pendente",
              offset,
              limit: 100,
            },
            controller.signal,
          );

          resultado.push(...paginaApi);

          if (paginaApi.length < 100) break;

          offset += 100;
        }

        resultado.sort(
          (a, b) =>
            a.data_vencimento.localeCompare(b.data_vencimento) ||
            a.id - b.id,
        );

        if (!controller.signal.aborted) {
          setItens(resultado);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErro(
            error instanceof TypeError
              ? "Não foi possível acessar a API."
              : error.message || "Não foi possível carregar a agenda.",
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
  }, [versao]);

  const fimPeriodo = adicionarDias(hoje, 6);

  const filtrados = itens.filter((item) => {
    if (tipo && item.tipo !== tipo) return false;

    if (aba === "atrasados") {
      return item.data_vencimento < hoje;
    }

    return (
      item.data_vencimento >= hoje &&
      item.data_vencimento <= fimPeriodo
    );
  });

  const aPagar = filtrados
    .filter((item) => item.tipo === "despesa")
    .reduce((total, item) => total + centavos(item.valor), 0);

  const aReceber = filtrados
    .filter((item) => item.tipo === "receita")
    .reduce((total, item) => total + centavos(item.valor), 0);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / 8));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = filtrados.slice(paginaAtual * 8, paginaAtual * 8 + 8);

  function mudarAba(valor) {
    setAba(valor);
    setPagina(0);
  }

  return (
    <section
      className="agenda-financeira"
      aria-labelledby="titulo-agenda"
      aria-busy={carregando}
    >
      <div className="agenda-cabecalho">
        <div>
          <h2 id="titulo-agenda">Agenda financeira</h2>
          <p>O que falta pagar e receber.</p>
        </div>

        <label className="agenda-filtro">
          Mostrar
          <select
            value={tipo}
            onChange={(event) => {
              setTipo(event.target.value);
              setPagina(0);
            }}
          >
            <option value="">Receitas</option>
            <option value="despesa">Despesas</option>
            <option value="receita">Receitas</option>
          </select>
        </label>
      </div>

      <div className="agenda-abas" aria-label="Período da agenda">
        <button
          type="button"
          aria-pressed={aba === "atrasados"}
          onClick={() => mudarAba("atrasados")}
        >
          Atrasados
        </button>

        <button
          type="button"
          aria-pressed={aba === "proximos"}
          onClick={() => mudarAba("proximos")}
        >
          Próximos 7 dias
        </button>
      </div>

      <p className="agenda-periodo">
        {aba === "atrasados"
          ? `Pendentes com data prevista anterior a ${formatarData(hoje)}.`
          : `De ${formatarData(hoje)} até ${formatarData(fimPeriodo)}, incluindo hoje.`}
      </p>

      {carregando ? (
        <p className="agenda-vazio" role="status">
          Carregando agenda...
        </p>
      ) : erro ? (
        <div className="agenda-erro" role="alert">
          <p>{erro}</p>
          <button
            type="button"
            className="agenda-botao"
            onClick={() => setVersao((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="agenda-resumo">
            <div>
              <span>A pagar</span>
              <strong className="agenda-despesa">
                {moeda.format(aPagar / 100)}
              </strong>
            </div>

            <div>
              <span>A receber</span>
              <strong className="agenda-receita">
                {moeda.format(aReceber / 100)}
              </strong>
            </div>
          </div>

          {filtrados.length === 0 ? (
            <p className="agenda-vazio">
              {aba === "atrasados"
                ? "Nenhum lançamento atrasado nesse filtro."
                : "Nenhum lançamento previsto para esse período."}
            </p>
          ) : (
            <>
              <ul className="agenda-lista">
                {visiveis.map((item) => (
                  <li key={item.id}>
                    <div className="agenda-item-info">
                      <strong>{item.descricao}</strong>

                      <span>
                        {item.tipo === "receita"
                          ? "Recebimento previsto"
                          : "Vencimento"}
                        : {formatarData(item.data_vencimento)}
                      </span>

                      {item.data_vencimento < hoje && (
                        <small className="agenda-atrasado">
                          {item.tipo === "receita"
                            ? "Recebimento em atraso"
                            : "Pagamento em atraso"}
                        </small>
                      )}

                      {item.data_vencimento === hoje && (
                        <small className="agenda-hoje">
                          Previsto para hoje
                        </small>
                      )}
                    </div>

                    <div className="agenda-item-valor">
                      <strong
                        className={
                          item.tipo === "receita"
                            ? "agenda-receita"
                            : "agenda-despesa"
                        }
                      >
                        {moeda.format(centavos(item.valor) / 100)}
                      </strong>

                      <span>
                        {item.tipo === "receita" ? "A receber" : "A pagar"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="agenda-paginacao">
                <span>
                  {filtrados.length} lançamento(s) · Página{" "}
                  {paginaAtual + 1} de {totalPaginas}
                </span>

                <div>
                  <button
                    type="button"
                    className="agenda-botao"
                    disabled={paginaAtual === 0}
                    onClick={() => setPagina(paginaAtual - 1)}
                  >
                    Anterior
                  </button>

                  <button
                    type="button"
                    className="agenda-botao"
                    disabled={paginaAtual + 1 >= totalPaginas}
                    onClick={() => setPagina(paginaAtual + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <p className="agenda-nota">
        Para registrar um pagamento ou recebimento, abra Gerenciar
        lançamentos. A agenda será atualizada após a confirmação.
      </p>
    </section>
  );
}