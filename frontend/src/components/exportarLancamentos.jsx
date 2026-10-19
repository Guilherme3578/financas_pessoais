import { useRef, useState } from "react";
import { consultarApi } from "../services/api";
import { listarCategorias } from "../services/categorias";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

const estilos = `
  .acoes-financeiras .exportar-abrir {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 43px;
    padding: 0 16px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: #174f3e;
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    white-space: nowrap;
    cursor: pointer;
    transition: background-color 160ms ease;
  }

  .acoes-financeiras .exportar-abrir:hover {
    background: #e8f1ec;
  }

  .exportar-dialog {
    box-sizing: border-box;
    width: min(620px, calc(100vw - 32px));
    max-height: calc(100dvh - 40px);
    margin: auto;
    padding: 28px;
    overflow-y: auto;
    border: 1px solid #dce7e0;
    border-radius: 20px;
    background: #ffffff;
    color: #172b27;
    font-family: inherit;
    box-shadow: 0 24px 80px #102f2633;
  }

  .exportar-dialog *,
  .exportar-dialog *::before,
  .exportar-dialog *::after {
    box-sizing: border-box;
  }

  .exportar-dialog::backdrop {
    background: #173c3459;
    backdrop-filter: blur(5px);
  }

  .exportar-dialog .exportar-cabecalho {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .exportar-dialog .exportar-titulo {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .exportar-dialog .exportar-descricao {
    margin: 0 0 24px;
    color: #637970;
    font-size: 14px;
    line-height: 1.6;
  }

  .exportar-dialog .exportar-campos {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .exportar-dialog .exportar-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }

  .exportar-dialog .exportar-label {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
    color: #456457;
    font-size: 13px;
    font-weight: 600;
  }

  .exportar-dialog .exportar-label input,
  .exportar-dialog .exportar-label select {
    width: 100%;
    min-width: 0;
    height: 44px;
    padding: 0 12px;
    border: 1px solid #cbded2;
    border-radius: 9px;
    background: #ffffff;
    color: #172b27;
    font: inherit;
    font-size: 14px;
    font-weight: 400;
    color-scheme: light;
  }

  .exportar-dialog .exportar-label input:focus-visible,
  .exportar-dialog .exportar-label select:focus-visible {
    outline: 2px solid #174f3e;
    outline-offset: 2px;
  }

  .exportar-dialog .exportar-nota {
    margin: 18px 0 0;
    color: #708178;
    font-size: 12px;
    line-height: 1.6;
  }

  .exportar-dialog .exportar-acoes {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 26px;
  }

  .exportar-dialog .exportar-botao {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    margin: 0;
    padding: 0 16px;
    border: 1px solid #d7e4dd;
    border-radius: 9px;
    background: #f4f7f6;
    color: #174f3e;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    transition: background-color 160ms ease, opacity 160ms ease;
  }

  .exportar-dialog .exportar-botao:hover:not(:disabled) {
    background: #e8f1ec;
  }

  .exportar-dialog .exportar-botao-primario {
    border-color: #174f3e;
    background: #174f3e;
    color: #ffffff;
  }

  .exportar-dialog .exportar-botao-primario:hover:not(:disabled) {
    background: #22644f;
  }

  .exportar-dialog .exportar-fechar {
    width: 36px;
    min-height: 36px;
    flex-shrink: 0;
    padding: 0;
    border: 0;
  }

  .exportar-dialog .exportar-botao:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .exportar-dialog .exportar-botao:focus-visible,
  .acoes-financeiras .exportar-abrir:focus-visible {
    outline: 2px solid #174f3e;
    outline-offset: 3px;
  }

  .exportar-dialog .exportar-aviso {
    margin: 20px 0 0;
    padding: 12px 14px;
    border-radius: 9px;
    font-size: 13px;
    line-height: 1.5;
  }

  .exportar-dialog .exportar-erro {
    background: #fff1f0;
    color: #b54848;
  }

  .exportar-dialog .exportar-sucesso {
    background: #edf6ef;
    color: #174f3e;
  }

  @media (max-width: 600px) {
    .acoes-financeiras .exportar-abrir {
      width: 100%;
      min-height: 42px;
      font-size: 11px;
    }

    .exportar-dialog {
      padding: 22px;
    }

    .exportar-dialog .exportar-grid {
      grid-template-columns: 1fr;
    }

    .exportar-dialog .exportar-titulo {
      font-size: 20px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .acoes-financeiras .exportar-abrir,
    .exportar-dialog .exportar-botao {
      transition: none;
    }
  }
`;

const formasPagamento = {
  pix: "Pix",
  debito: "Débito",
  dinheiro: "Dinheiro",
  transferencia: "Transferência",
  boleto: "Boleto",
};

function mesAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function periodoDoMes(mes) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  const ultimoDia = new Date(ano, numeroMes, 0).getDate();

  return {
    inicio: `${mes}-01`,
    fim: `${mes}-${ultimoDia}`,
  };
}

function textoCsv(valor) {
  let texto = String(valor ?? "");

  if (/^\s*[=+\-@]/.test(texto)) {
    texto = `'${texto}`;
  }

  return `"${texto.replaceAll('"', '""')}"`;
}

function dataBrasileira(data) {
  return data ? data.slice(0, 10).split("-").reverse().join("/") : "";
}

function statusLegivel(lancamento) {
  if (lancamento.status === "efetivado") {
    return lancamento.tipo === "receita" ? "Recebido" : "Pago";
  }

  return lancamento.status === "cancelado" ? "Cancelado" : "Pendente";
}

function baixarArquivo(arquivo, nome) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");

  try {
    link.href = url;
    link.download = nome;

    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

async function gerarExcel({ inicio, fim, tipo, status }) {
  const parametros = new URLSearchParams({
    data_inicio: inicio,
    data_fim: fim,
  });

  if (tipo) parametros.set("tipo", tipo);
  if (status) parametros.set("status", status);

  const resposta = await fetch(
    `${API_URL}/relatorios/lancamentos.xlsx?${parametros}`,
  );

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    const detalhe = corpo?.detail;

    if (typeof detalhe === "string") {
      throw new Error(detalhe);
    }

    if (Array.isArray(detalhe)) {
      throw new Error(
        detalhe.map((item) => item.msg).join(" · "),
      );
    }

    throw new Error(
      `Não foi possível gerar o Excel. Código: ${resposta.status}.`,
    );
  }

  return resposta.blob();
}

async function gerarCsv({ inicio, fim, tipo, status }) {
  const categorias = await listarCategorias();
  const nomesCategorias = new Map(
    categorias.map((categoria) => [categoria.id, categoria.nome]),
  );

  const lancamentos = [];
  let offset = 0;

  while (true) {
    const pagina = await consultarApi("/lancamentos", {
      competencia_inicio: inicio,
      competencia_fim: fim,
      tipo,
      status,
      offset,
      limit: 100,
    });

    lancamentos.push(...pagina);

    if (pagina.length < 100) break;

    offset += 100;
  }

  const cabecalho = [
    "ID",
    "Descrição",
    "Tipo",
    "Categoria",
    "Valor",
    "Competência",
    "Pagamento / recebimento previsto",
    "Pagamento / recebimento realizado",
    "Status",
    "Forma de pagamento",
    "Observação",
  ];

  const linhas = lancamentos.map((item) => [
    item.id,
    item.descricao,
    item.tipo === "receita" ? "Receita" : "Despesa",
    nomesCategorias.get(item.categoria_id) ?? `Categoria ${item.categoria_id}`,
    String(item.valor).replace(".", ","),
    dataBrasileira(item.data_competencia),
    dataBrasileira(item.data_vencimento),
    dataBrasileira(item.data_efetivacao),
    statusLegivel(item),
    formasPagamento[item.forma_pagamento] ?? item.forma_pagamento,
    item.observacao ?? "",
  ]);

  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(textoCsv).join(";"))
    .join("\r\n");

  return new Blob(["\uFEFF", conteudo], {
    type: "text/csv;charset=utf-8;",
  });
}

export default function ExportarLancamentos() {
  const dialogRef = useRef(null);
  const ocupadoRef = useRef(false);

  const [mes, setMes] = useState(mesAtual);
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [formato, setFormato] = useState("xlsx");
  const [exportando, setExportando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function limparMensagens() {
    setErro("");
    setMensagem("");
  }

  function abrir() {
    limparMensagens();
    dialogRef.current.showModal();
  }

  function fechar() {
    if (!ocupadoRef.current) {
      dialogRef.current.close();
    }
  }

  async function exportar(event) {
    event.preventDefault();

    if (ocupadoRef.current) return;

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
      setErro("Selecione um mês válido.");
      return;
    }

    ocupadoRef.current = true;
    setExportando(true);
    limparMensagens();

    try {
      const parametros = {
        ...periodoDoMes(mes),
        tipo,
        status,
      };

      const arquivo =
        formato === "xlsx"
          ? await gerarExcel(parametros)
          : await gerarCsv(parametros);

      const nome =
        `lancamentos-${mes}-${tipo || "todos"}-` +
        `${status || "todos"}.${formato}`;

      baixarArquivo(arquivo, nome);

      setMensagem(
        "Arquivo gerado. Confira os downloads do navegador.",
      );
    } catch (error) {
      setErro(
        error instanceof TypeError
          ? "Não foi possível acessar a API. Confira se ela está rodando."
          : error.message || "Não foi possível exportar os lançamentos.",
      );
    } finally {
      ocupadoRef.current = false;
      setExportando(false);
    }
  }

  return (
    <>
      <style>{estilos}</style>

      <button
        type="button"
        className="exportar-abrir"
        onClick={abrir}
      >
        Exportar
      </button>

      <dialog
        ref={dialogRef}
        className="exportar-dialog"
        aria-labelledby="titulo-exportar"
        aria-describedby="descricao-exportar"
        onCancel={(event) => {
          if (ocupadoRef.current) {
            event.preventDefault();
          }
        }}
      >
        <div className="exportar-cabecalho">
          <h2 id="titulo-exportar" className="exportar-titulo">
            Exportar lançamentos
          </h2>

          <button
            type="button"
            className="exportar-botao exportar-fechar"
            onClick={fechar}
            disabled={exportando}
            aria-label="Fechar exportação"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <p id="descricao-exportar" className="exportar-descricao">
          Escolha o mês e baixe seus lançamentos.
        </p>

        <form onSubmit={exportar} aria-busy={exportando}>
          <fieldset
            className="exportar-campos"
            disabled={exportando}
          >
            <div className="exportar-grid">
              <label className="exportar-label">
                Mês de competência
                <input
                  type="month"
                  value={mes}
                  min="1900-01"
                  max="9999-12"
                  required
                  onChange={(event) => {
                    setMes(event.target.value);
                    limparMensagens();
                  }}
                />
              </label>

              <label className="exportar-label">
                Formato
                <select
                  value={formato}
                  onChange={(event) => {
                    setFormato(event.target.value);
                    limparMensagens();
                  }}
                >
                  <option value="xlsx">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                </select>
              </label>

              <label className="exportar-label">
                Tipo
                <select
                  value={tipo}
                  onChange={(event) => {
                    setTipo(event.target.value);
                    limparMensagens();
                  }}
                >
                  <option value="">Receitas e despesas</option>
                  <option value="receita">Receitas</option>
                  <option value="despesa">Despesas</option>
                </select>
              </label>

              <label className="exportar-label">
                Status
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    limparMensagens();
                  }}
                >
                  <option value="">Todos, incluindo cancelados</option>
                  <option value="pendente">Pendentes</option>
                  <option value="efetivado">Pagos / recebidos</option>
                  <option value="cancelado">Cancelados</option>
                </select>
              </label>
            </div>

            <p className="exportar-nota">
              {formato === "xlsx"
                ? "Planilha formatada, com filtros e datas e valores numéricos. Limite de 10.000 lançamentos por exportação."
                : "Arquivo separado por ponto e vírgula, com valores no formato brasileiro."}
            </p>

            {erro && (
              <p
                className="exportar-aviso exportar-erro"
                role="alert"
              >
                {erro}
              </p>
            )}

            {mensagem && (
              <p
                className="exportar-aviso exportar-sucesso"
                role="status"
              >
                {mensagem}
              </p>
            )}

            <div className="exportar-acoes">
              <button
                type="button"
                className="exportar-botao"
                onClick={fechar}
              >
                Fechar
              </button>

              <button
                type="submit"
                className="exportar-botao exportar-botao-primario"
              >
                {exportando
                  ? "Exportando..."
                  : formato === "xlsx"
                    ? "Baixar Excel"
                    : "Baixar CSV"}
              </button>
            </div>
          </fieldset>
        </form>
      </dialog>
    </>
  );
}