import { useEffect, useRef, useState } from "react";
import { listarCategorias } from "../services/categorias";
import {
  listarOrcamentos,
  salvarOrcamento,
  excluirOrcamento,
} from "../services/orcamentos";
import "./Orcamentos.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function mesAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

function mesAnterior(mes) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  const data = new Date(ano, numeroMes - 2, 1, 12);

  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function normalizarValor(entrada) {
  const texto = entrada.trim();

  const valido =
    /^\d+(?:[,.]\d{1,2})?$/.test(texto) ||
    /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(texto);

  if (!valido) return null;

  const valor = texto.includes(",")
    ? texto.replaceAll(".", "").replace(",", ".")
    : /^\d{1,3}(?:\.\d{3})+$/.test(texto)
      ? texto.replaceAll(".", "")
      : texto;

  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) {
    return null;
  }

  return valor;
}

export default function Orcamentos() {
  const dialogRef = useRef(null);
  const ocupadoRef = useRef(false);

  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(mesAtual);
  const [categorias, setCategorias] = useState([]);
  const [itens, setItens] = useState([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [limite, setLimite] = useState("");
  const [editando, setEditando] = useState(null);
  const [removendo, setRemovendo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [copiando, setCopiando] = useState(false);
  const [mostrarCopia, setMostrarCopia] = useState(false);
  const [origem, setOrigem] = useState(() => mesAnterior(mesAtual()));
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [falhaCarga, setFalhaCarga] = useState(false);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!aberto) return;

    const controller = new AbortController();

    async function carregar() {
      setCarregando(true);
      setFalhaCarga(false);
      setErro("");

      try {
        const [lista, categoriasApi] = await Promise.all([
          listarOrcamentos(`${mes}-01`, controller.signal),
          listarCategorias(controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setItens(lista);
          setCategorias(categoriasApi);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setFalhaCarga(true);
          setErro(
            error instanceof TypeError
              ? "Não foi possível acessar a API."
              : error.message || "Não foi possível carregar os orçamentos.",
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
  }, [aberto, mes, versao]);

  function limparFormulario() {
    setCategoriaId("");
    setLimite("");
    setEditando(null);
  }

  function abrir() {
    limparFormulario();
    setRemovendo(null);
    setMostrarCopia(false);
    setOrigem(mesAnterior(mes));
    setErro("");
    setSucesso("");
    setCarregando(true);
    setAberto(true);
    dialogRef.current.showModal();
  }

  function fechar() {
    if (ocupadoRef.current) return;

    dialogRef.current.close();
    setAberto(false);
  }

  function mudarMes(event) {
    if (ocupadoRef.current) return;
    if (!event.target.value || !event.target.validity.valid) return;

    const novoMes = event.target.value;

    setMes(novoMes);
    setOrigem(mesAnterior(novoMes));
    setMostrarCopia(false);
    limparFormulario();
    setRemovendo(null);
    setErro("");
    setSucesso("");
    setCarregando(true);
  }

  function editar(item) {
    if (ocupadoRef.current) return;

    setEditando(item.id);
    setCategoriaId(String(item.categoria_id));
    setLimite(String(item.limite).replace(".", ","));
    setRemovendo(null);
    setMostrarCopia(false);
    setErro("");
    setSucesso("");

    dialogRef.current.scrollTo({ top: 0, behavior: "auto" });
  }

  async function salvar(event) {
    event.preventDefault();

    if (ocupadoRef.current || carregando || falhaCarga) return;

    const valor = normalizarValor(limite);

    if (!valor) {
      setErro("Informe um limite positivo, como 600,00 ou 1.200,00.");
      return;
    }

    if (!categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }

    ocupadoRef.current = true;
    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const resultado = await salvarOrcamento({
        categoria_id: Number(categoriaId),
        competencia: `${mes}-01`,
        limite: valor,
      });

      setItens((atuais) =>
        [
          ...atuais.filter((item) => item.id !== resultado.id),
          resultado,
        ].sort((a, b) => a.categoria_nome.localeCompare(b.categoria_nome)),
      );

      limparFormulario();
      setSucesso("Limite salvo.");
    } catch (error) {
      setErro(
        error instanceof TypeError
          ? "Falha de conexão. Reabra a janela para conferir se o limite foi salvo."
          : error.message || "Não foi possível salvar o limite.",
      );
    } finally {
      ocupadoRef.current = false;
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (ocupadoRef.current || !removendo) return;

    ocupadoRef.current = true;
    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      await excluirOrcamento(removendo.id);

      setItens((atuais) =>
        atuais.filter((item) => item.id !== removendo.id),
      );

      if (editando === removendo.id) limparFormulario();

      setRemovendo(null);
      setSucesso("Limite removido. Os lançamentos foram mantidos.");
    } catch (error) {
      setErro(
        error instanceof TypeError
          ? "Falha de conexão. Reabra a janela para conferir se o limite foi removido."
          : error.message || "Não foi possível remover o limite.",
      );
    } finally {
      ocupadoRef.current = false;
      setSalvando(false);
    }
  }

  async function copiar(event) {
    event.preventDefault();

    if (ocupadoRef.current || carregando || falhaCarga) return;

    if (!origem || origem === mes) {
      setErro("Escolha um mês de origem diferente do mês de destino.");
      return;
    }

    ocupadoRef.current = true;
    setCopiando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch(`${API_URL}/orcamentos/copiar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origem: `${origem}-01`,
          destino: `${mes}-01`,
        }),
      });

      const corpo = await resposta.json().catch(() => null);

      if (!resposta.ok) {
        const detalhe = corpo?.detail;

        throw new Error(
          typeof detalhe === "string"
            ? detalhe
            : Array.isArray(detalhe)
              ? detalhe.map((item) => item.msg).join(" · ")
              : "Não foi possível copiar os limites.",
        );
      }

      setMostrarCopia(false);
      setSucesso(
        `${corpo.copiados} limite(s) copiado(s). ` +
          `${corpo.ja_existentes} já existente(s). ` +
          `${corpo.categorias_indisponiveis} categoria(s) indisponível(is).`,
      );
      setCarregando(true);
      setVersao((atual) => atual + 1);
    } catch (error) {
      setErro(
        error instanceof TypeError
          ? "Falha de conexão. Reabra a janela para conferir se os limites foram copiados."
          : error.message || "Não foi possível copiar os limites.",
      );
    } finally {
      ocupadoRef.current = false;
      setCopiando(false);
    }
  }

  const categoriasDisponiveis = categorias.filter(
    (categoria) => categoria.tipo === "despesa" && categoria.ativo,
  );

  const categoriasAtivas = new Set(
    categoriasDisponiveis.map((categoria) => categoria.id),
  );

  const ocupado = salvando || copiando;
  const bloqueado = carregando || ocupado || falhaCarga;

  return (
    <>
      <button
        type="button"
        className="orcamentos-abrir"
        onClick={abrir}
      >
        Orçamentos
      </button>

      <dialog
        ref={dialogRef}
        className="orcamentos-dialog"
        aria-labelledby="titulo-orcamentos"
        onClose={() => setAberto(false)}
        onCancel={(event) => {
          if (ocupadoRef.current) event.preventDefault();
        }}
      >
        <header className="orcamentos-cabecalho">
          <div>
            <h2 id="titulo-orcamentos">Orçamentos</h2>
            <p>Defina quanto quer gastar em cada categoria.</p>
          </div>

          <button
            type="button"
            className="orcamentos-botao"
            onClick={fechar}
            disabled={ocupado}
          >
            Fechar
          </button>
        </header>

        <label className="orcamentos-label orcamentos-mes">
          Mês de competência
          <input
            type="month"
            value={mes}
            min="1900-01"
            max="9999-12"
            onChange={mudarMes}
            disabled={ocupado}
            required
          />
        </label>

        {erro && (
          <p className="orcamentos-aviso orcamentos-erro" role="alert">
            {erro}
          </p>
        )}

        {sucesso && (
          <p className="orcamentos-aviso orcamentos-sucesso" role="status">
            {sucesso}
          </p>
        )}

        {carregando ? (
          <p className="orcamentos-vazio" role="status">
            Carregando orçamentos...
          </p>
        ) : falhaCarga ? (
          <button
            type="button"
            className="orcamentos-botao"
            onClick={() => {
              setCarregando(true);
              setVersao((atual) => atual + 1);
            }}
          >
            Tentar novamente
          </button>
        ) : (
          <>
            <div
              style={{
                marginBottom: 24,
                padding: 16,
                border: "1px solid #dfe8e2",
                borderRadius: 12,
                background: "#f8faf9",
              }}
            >
              <button
                type="button"
                className="orcamentos-botao"
                disabled={
                  bloqueado || Boolean(editando) || Boolean(removendo)
                }
                aria-expanded={mostrarCopia}
                aria-controls="formulario-copia-orcamentos"
                onClick={() => {
                  setMostrarCopia((atual) => !atual);
                  setErro("");
                  setSucesso("");
                }}
              >
                {mostrarCopia
                  ? "Fechar cópia"
                  : "Copiar limites de outro mês"}
              </button>

              {mostrarCopia && (
                <form
                  id="formulario-copia-orcamentos"
                  onSubmit={copiar}
                  style={{ marginTop: 16 }}
                >
                  <label className="orcamentos-label">
                    Copiar do mês
                    <input
                      type="month"
                      value={origem}
                      min="1900-01"
                      max="9999-12"
                      required
                      disabled={ocupado}
                      onChange={(event) => {
                        setOrigem(event.target.value);
                        setErro("");
                        setSucesso("");
                      }}
                    />
                  </label>

                  <p className="orcamentos-nota">
                    Os limites serão copiados para{" "}
                    <strong>
                      {mes.split("-").reverse().join("/")}
                    </strong>
                    . Os limites já existentes serão mantidos.
                    Os lançamentos não serão copiados.
                  </p>

                  <div
                    className="orcamentos-acoes"
                    style={{ marginTop: 16 }}
                  >
                    <button
                      type="submit"
                      className="orcamentos-botao orcamentos-primario"
                      disabled={bloqueado}
                    >
                      {copiando ? "Copiando..." : "Copiar limites"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <form onSubmit={salvar}>
              <fieldset
                className="orcamentos-formulario"
                disabled={
                  bloqueado || Boolean(removendo) || mostrarCopia
                }
              >
                <legend>
                  {editando ? "Editar limite" : "Definir limite"}
                </legend>

                <div className="orcamentos-grid">
                  <label className="orcamentos-label">
                    Categoria de despesa
                    <select
                      value={categoriaId}
                      onChange={(event) => setCategoriaId(event.target.value)}
                      disabled={Boolean(editando)}
                      required
                    >
                      <option value="">Selecione</option>

                      {categoriasDisponiveis.map((categoria) => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="orcamentos-label">
                    Limite mensal
                    <input
                      type="text"
                      inputMode="decimal"
                      value={limite}
                      onChange={(event) => setLimite(event.target.value)}
                      placeholder="600,00"
                      maxLength={24}
                      required
                    />
                  </label>
                </div>

                {categoriasDisponiveis.length === 0 && (
                  <p className="orcamentos-nota">
                    Cadastre ou ative uma categoria de despesa primeiro.
                  </p>
                )}

                <div className="orcamentos-acoes">
                  {editando && (
                    <button
                      type="button"
                      className="orcamentos-botao"
                      onClick={limparFormulario}
                    >
                      Cancelar edição
                    </button>
                  )}

                  <button
                    type="submit"
                    className="orcamentos-botao orcamentos-primario"
                    disabled={categoriasDisponiveis.length === 0}
                  >
                    {salvando ? "Salvando..." : "Salvar limite"}
                  </button>
                </div>
              </fieldset>
            </form>

            {removendo && (
              <div className="orcamentos-confirmacao">
                <p>
                  Remover o limite de{" "}
                  <strong>{removendo.categoria_nome}</strong> deste mês?
                  Os lançamentos serão mantidos.
                </p>

                <div className="orcamentos-acoes">
                  <button
                    type="button"
                    className="orcamentos-botao"
                    disabled={ocupado}
                    onClick={() => setRemovendo(null)}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="orcamentos-botao orcamentos-perigo"
                    disabled={ocupado}
                    onClick={confirmarExclusao}
                  >
                    {salvando ? "Removendo..." : "Remover limite"}
                  </button>
                </div>
              </div>
            )}

            {itens.length === 0 ? (
              <p className="orcamentos-vazio">
                Nenhum limite definido para este mês.
              </p>
            ) : (
              <ul className="orcamentos-lista">
                {itens.map((item) => {
                  const limiteAtual = Number(item.limite);
                  const comprometido = Number(item.comprometido);
                  const disponivel = Number(item.disponivel);
                  const percentual =
                    limiteAtual > 0
                      ? (comprometido / limiteAtual) * 100
                      : 0;

                  const excedido = disponivel < 0;
                  const categoriaAtiva = categoriasAtivas.has(
                    item.categoria_id,
                  );

                  return (
                    <li key={item.id}>
                      <div className="orcamentos-item-topo">
                        <strong>{item.categoria_nome}</strong>
                        <span>Limite: {moeda.format(limiteAtual)}</span>
                      </div>

                      <div
                        className={`orcamentos-barra ${
                          excedido ? "orcamentos-barra-excedida" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, percentual),
                            )}%`,
                          }}
                        />
                      </div>

                      <div className="orcamentos-detalhes">
                        <span>
                          Pago: {moeda.format(Number(item.pago))}
                        </span>

                        <span>
                          Pendente: {moeda.format(Number(item.pendente))}
                        </span>
                      </div>

                      <div className="orcamentos-item-rodape">
                        <div>
                          <strong
                            className={
                              excedido ? "orcamentos-texto-perigo" : ""
                            }
                          >
                            {excedido
                              ? `${moeda.format(
                                  Math.abs(disponivel),
                                )} acima do limite`
                              : `${moeda.format(disponivel)} disponíveis`}
                          </strong>

                          <small>
                            {percentual.toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })}
                            % comprometido
                          </small>
                        </div>

                        <div className="orcamentos-acoes">
                          <button
                            type="button"
                            className="orcamentos-botao"
                            disabled={
                              bloqueado ||
                              Boolean(removendo) ||
                              mostrarCopia ||
                              !categoriaAtiva
                            }
                            onClick={() => editar(item)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="orcamentos-botao"
                            disabled={
                              bloqueado ||
                              Boolean(removendo) ||
                              mostrarCopia
                            }
                            onClick={() => {
                              setRemovendo(item);
                              setErro("");
                              setSucesso("");
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>

                      {!categoriaAtiva && (
                        <p className="orcamentos-nota">
                          A categoria precisa estar ativa e ser de
                          despesa para editar o limite.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <p className="orcamentos-nota">
              O disponível desconta despesas pagas e pendentes do mês
              de competência. Canceladas não entram. Salvar a mesma
              categoria no mesmo mês atualiza o limite existente.
            </p>
          </>
        )}
      </dialog>
    </>
  );
}