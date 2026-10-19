import { useEffect, useState } from "react";
import { consultarApi } from "../services/api";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const nomesStatus = {
  pendente: "Pendente",
  efetivado: "Efetivado",
  cancelado: "Cancelado",
};

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

const anoAtual = new Date().getFullYear();
const anos = Array.from(
  { length: 21 },
  (_, indice) => anoAtual - 10 + indice,
);

function mesAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function quantidadeDiasDoMes(mes) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  return new Date(ano, numeroMes, 0).getDate();
}

function periodoSelecionado(mes, dia) {
  if (dia) {
    return { inicio: `${mes}-${dia}`, fim: `${mes}-${dia}` };
  }

  return {
    inicio: `${mes}-01`,
    fim: `${mes}-${quantidadeDiasDoMes(mes)}`,
  };
}

function formatarData(data) {
  return data.split("-").reverse().join("/");
}

function IconeCalendario() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 11h18" />
      <path d="M8 15h2M14 15h2" />
    </svg>
  );
}

function IconeAtualizar() {
  return (
    <svg
      width="17" height="17" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.1 7a7 7 0 0 1 11.6-1L20 9" />
      <path d="M4 15l2.3 3A7 7 0 0 0 17.9 17" />
    </svg>
  );
}

function Cartao({ titulo, valor, classe = "" }) {
  return (
    <article className={`cartao ${classe}`}>
      <span className="cartao-titulo">{titulo}</span>
      <strong>{moeda.format(valor)}</strong>
      <small />
    </article>
  );
}

function ConteudoDashboard({ mes, dia }) {
  const [estado, setEstado] = useState({
    carregando: true,
    erro: "",
    resumo: null,
    lancamentos: [],
  });

  useEffect(() => {
    const controller = new AbortController();
    const periodo = periodoSelecionado(mes, dia);

    async function carregar() {
      try {
        const [resumo, lancamentos] = await Promise.all([
          consultarApi(
            "/dashboard/resumo",
            {
              data_inicio: periodo.inicio,
              data_fim: periodo.fim,
            },
            controller.signal,
          ),
          consultarApi(
            "/lancamentos",
            {
              competencia_inicio: periodo.inicio,
              competencia_fim: periodo.fim,
              limit: 10,
            },
            controller.signal,
          ),
        ]);

        if (!controller.signal.aborted) {
          setEstado({
            carregando: false,
            erro: "",
            resumo,
            lancamentos,
          });
        }
      } catch (erro) {
        if (!controller.signal.aborted) {
          setEstado({
            carregando: false,
            erro:
              erro instanceof TypeError
                ? "Não foi possível conectar à API. Confira se o backend está rodando."
                : erro.message,
            resumo: null,
            lancamentos: [],
          });
        }
      }
    }

    carregar();
    return () => controller.abort();
  }, [mes, dia]);

  if (estado.carregando) {
    return (
      <div className="mensagem carregamento" role="status">
        <span className="spinner" aria-hidden="true" />
        Carregando lançamentos…
      </div>
    );
  }

  if (estado.erro) {
    return (
      <div className="mensagem mensagem-erro" role="alert">
        <strong>Não foi possível carregar o painel.</strong>
        <span>{estado.erro}</span>
        <span>Use o botão Atualizar para tentar novamente.</span>
      </div>
    );
  }

  const { resumo, lancamentos } = estado;

  return (
    <>
      <section className="cartoes" aria-label="Resumo financeiro">
        <Cartao
          titulo="Receitas"
          valor={resumo.receitas_efetivadas}
          classe="positivo"
        />
        <Cartao
          titulo="Despesas"
          valor={resumo.despesas_efetivadas}
          classe="negativo"
        />
        <Cartao
          titulo={dia ? "Resultado do dia" : "Resultado do mês"}
          valor={resumo.saldo_realizado}
          classe={
            Number(resumo.saldo_realizado) >= 0
              ? "positivo"
              : "negativo"
          }
        />
        <Cartao
          titulo="Resultado previsto"
          valor={resumo.saldo_previsto}
          classe="destaque"
        />
      </section>

      <section className="pendencias" aria-label="Valores pendentes">
        <div>
          <span>A receber</span>
          <strong className="texto-positivo">
            {moeda.format(resumo.receitas_pendentes)}
          </strong>
        </div>
        <div>
          <span>A pagar</span>
          <strong className="texto-negativo">
            {moeda.format(resumo.despesas_pendentes)}
          </strong>
        </div>
        <div>
          <span>Lançamentos válidos</span>
          <strong>{resumo.quantidade_lancamentos}</strong>
        </div>
      </section>

      <section className="painel">
        <div className="painel-cabecalho">
          <div>
            <h2>{dia ? "Lançamentos do dia" : "Lançamentos do mês"}</h2>
            <p>Os 10 mais recentes por competência.</p>
          </div>
          <span className="contador">{lancamentos.length} exibidos</span>
        </div>

        {lancamentos.length === 0 ? (
          <div className="vazio">
            <span className="vazio-icone" aria-hidden="true">
              <IconeCalendario />
            </span>
            <h3>
              {dia
                ? "Nenhum lançamento neste dia"
                : "Nenhum lançamento neste mês"}
            </h3>
            <p>Escolha outro período ou cadastre um lançamento.</p>
          </div>
        ) : (
          <div className="tabela-container">
            <table>
              <thead>
                <tr>
                  <th scope="col">Descrição</th>
                  <th scope="col">Competência</th>
                  <th scope="col">Pagamento / recebimento previsto</th>
                  <th scope="col">Tipo</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="valor">Valor</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((item) => (
                  <tr key={item.id}>
                    <td className="descricao">{item.descricao}</td>
                    <td>{formatarData(item.data_competencia)}</td>
                    <td>{formatarData(item.data_vencimento)}</td>
                    <td>{item.tipo === "receita" ? "Receita" : "Despesa"}</td>
                    <td>
                      <span className={`status ${item.status}`}>
                        {nomesStatus[item.status]}
                      </span>
                    </td>
                    <td
                      className={`valor ${
                        item.tipo === "receita"
                          ? "texto-positivo"
                          : "texto-negativo"
                      }`}
                    >
                      {moeda.format(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="nota">
        Valores por competência, sem cancelados e sem saldo de meses anteriores.
      </p>
    </>
  );
}

export default function Dashboard() {
  const [mes, setMes] = useState(mesAtual);
  const [dia, setDia] = useState("");
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    function atualizar() {
      setVersao((atual) => atual + 1);
    }

    window.addEventListener("lancamentos-atualizados", atualizar);

    return () => {
      window.removeEventListener("lancamentos-atualizados", atualizar);
    };
  }, []);

  const [anoSelecionado, mesSelecionado] = mes.split("-");
  const dias = Array.from(
    { length: quantidadeDiasDoMes(mes) },
    (_, indice) => String(indice + 1).padStart(2, "0"),
  );

  function alterarMes(novoMes) {
    setMes(novoMes);

    if (dia && Number(dia) > quantidadeDiasDoMes(novoMes)) {
      setDia("");
    }
  }

  return (
    <div className="aplicacao">
      <header className="barra">
        <a className="marca" href="/" aria-label="Finanças pessoais — início">
          <span className="marca-icone" aria-hidden="true">F</span>
          Finanças pessoais
        </a>
      </header>

      <main className="conteudo">
        <div className="cabecalho">
          <div>
            <span className="sobretitulo">PAINEL FINANCEIRO</span>
            <h1>{dia ? "Resumo do dia" : "Resumo do mês"}</h1>
            <p>Entradas, saídas e contas pendentes.</p>
          </div>

          <div className="periodo-toolbar">
            <div className="periodo-campo">
              <span className="periodo-label">Período</span>
              <div className="periodo-caixa">
                <IconeCalendario />

                <select
                  className="periodo-dia"
                  aria-label="Dia"
                  title="Selecione um dia ou Todos para o mês inteiro"
                  value={dia}
                  onChange={(evento) => setDia(evento.target.value)}
                >
                  <option value="">Todos</option>
                  {dias.map((numero) => (
                    <option key={numero} value={numero}>{numero}</option>
                  ))}
                </select>

                <span className="periodo-divisor" aria-hidden="true" />

                <select
                  className="periodo-mes"
                  aria-label="Mês"
                  value={mesSelecionado}
                  onChange={(evento) =>
                    alterarMes(`${anoSelecionado}-${evento.target.value}`)
                  }
                >
                  {meses.map((nome, indice) => {
                    const valor = String(indice + 1).padStart(2, "0");
                    return <option key={valor} value={valor}>{nome}</option>;
                  })}
                </select>

                <span className="periodo-divisor" aria-hidden="true" />

                <select
                  className="periodo-ano"
                  aria-label="Ano"
                  value={anoSelecionado}
                  onChange={(evento) =>
                    alterarMes(`${evento.target.value}-${mesSelecionado}`)
                  }
                >
                  {anos.map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="periodo-atualizar"
              type="button"
              onClick={() => setVersao((atual) => atual + 1)}
            >
              <IconeAtualizar />
              Atualizar
            </button>
          </div>
        </div>

        <ConteudoDashboard
          key={`${mes}-${dia}-${versao}`}
          mes={mes}
          dia={dia}
        />
      </main>
    </div>
  );
}