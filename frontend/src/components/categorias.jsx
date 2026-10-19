import { useEffect, useRef, useState } from "react";
import {
  atualizarCategoria,
  criarCategoria,
  listarCategorias,
} from "../services/categorias";

import "./NovoLancamento.css";
import "./Categorias.css";

export default function Categorias() {
  const dialogRef = useRef(null);
  const enviandoRef = useRef(false);

  const [aberto, setAberto] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("despesa");
  const [editando, setEditando] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }

    const controller = new AbortController();

    async function carregar() {
      try {
        const resultado = await listarCategorias(controller.signal);

        if (!controller.signal.aborted) {
          setCategorias(resultado);
        }
      } catch (falha) {
        if (!controller.signal.aborted) {
          setErro(
            falha instanceof TypeError
              ? "Não foi possível carregar as categorias."
              : falha.message,
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
  }, [aberto]);

  function abrir() {
    setNome("");
    setTipo("despesa");
    setEditando(null);
    setErro("");
    setSucesso("");
    setCategorias([]);
    setCarregando(true);
    setAberto(true);
    dialogRef.current.showModal();
  }

  function fechar() {
    if (!enviandoRef.current) {
      dialogRef.current.close();
    }
  }

  function escolherTipo(novoTipo) {
    setTipo(novoTipo);
    setNome("");
    setEditando(null);
    setErro("");
    setSucesso("");
  }

  function editar(categoria) {
    setEditando(categoria);
    setNome(categoria.nome);
    setErro("");
    setSucesso("");

    dialogRef.current.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }

  function cancelarEdicao() {
    setEditando(null);
    setNome("");
    setErro("");
  }

  function atualizarLista(categoria) {
    setCategorias((atuais) => {
      const outras = atuais.filter((item) => item.id !== categoria.id);

      return [...outras, categoria].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      );
    });
  }

  function mensagemErro(falha) {
    return falha instanceof TypeError
      ? "Não foi possível confirmar a alteração. Feche e reabra a lista antes de tentar novamente."
      : falha.message;
  }

  async function salvar(evento) {
    evento.preventDefault();

    if (enviandoRef.current) {
      return;
    }

    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      setErro("Informe o nome da categoria.");
      return;
    }

    enviandoRef.current = true;
    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const categoria = editando
        ? await atualizarCategoria(editando.id, {
            nome: nomeLimpo,
            tipo: editando.tipo,
            ativo: editando.ativo,
          })
        : await criarCategoria({
            nome: nomeLimpo,
            tipo,
            ativo: true,
          });

      atualizarLista(categoria);
      setSucesso(
        editando
          ? "Categoria atualizada."
          : `Categoria "${categoria.nome}" cadastrada.`,
      );
      setNome("");
      setEditando(null);
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      enviandoRef.current = false;
      setSalvando(false);
    }
  }

  async function alternarAtivo(categoria) {
    if (enviandoRef.current) {
      return;
    }

    enviandoRef.current = true;
    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const atualizada = await atualizarCategoria(categoria.id, {
        nome: categoria.nome,
        tipo: categoria.tipo,
        ativo: !categoria.ativo,
      });

      atualizarLista(atualizada);

      setSucesso(
        atualizada.ativo
          ? "Categoria ativada."
          : "Categoria desativada. Os lançamentos existentes foram mantidos.",
      );
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      enviandoRef.current = false;
      setSalvando(false);
    }
  }

  const categoriasFiltradas = categorias.filter(
    (categoria) => categoria.tipo === tipo,
  );

  return (
    <>
      <button
        type="button"
        className="categorias-abrir"
        onClick={abrir}
      >
        Categorias
      </button>

      <dialog
        ref={dialogRef}
        className="lancamento-dialog"
        aria-labelledby="titulo-categorias"
        onClose={() => setAberto(false)}
        onCancel={(evento) => {
          if (enviandoRef.current) {
            evento.preventDefault();
          }
        }}
      >
        <div className="lancamento-cabecalho">
          <div>
            <span className="sobretitulo">ORGANIZAÇÃO</span>
            <h2 id="titulo-categorias">Categorias</h2>
          </div>

          <button
            className="lancamento-fechar"
            type="button"
            aria-label="Fechar categorias"
            disabled={salvando}
            onClick={fechar}
          >
            ×
          </button>
        </div>

        <form onSubmit={salvar}>
          <fieldset
            className="lancamento-campos"
            disabled={salvando}
          >
            <div className="lancamento-tipos">
              <button
                type="button"
                aria-pressed={tipo === "despesa"}
                className={tipo === "despesa" ? "selecionado" : ""}
                onClick={() => escolherTipo("despesa")}
              >
                Despesas
              </button>

              <button
                type="button"
                aria-pressed={tipo === "receita"}
                className={tipo === "receita" ? "selecionado" : ""}
                onClick={() => escolherTipo("receita")}
              >
                Receitas
              </button>
            </div>

            {editando && (
              <p className="categorias-editando">
                Editando: <strong>{editando.nome}</strong>
              </p>
            )}

            <div className="lancamento-grid">
              <label className="campo-inteiro">
                Nome da categoria
                <input
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  placeholder={
                    tipo === "despesa"
                      ? "Ex.: Alimentação, transporte, moradia"
                      : "Ex.: Salário, freelance, rendimentos"
                  }
                  maxLength={80}
                  required
                  autoFocus
                />
              </label>
            </div>

            <div className="categorias-salvar">
              {editando && (
                <button
                  type="button"
                  className="lancamento-cancelar"
                  onClick={cancelarEdicao}
                >
                  Cancelar edição
                </button>
              )}

              <button
                className="lancamento-salvar"
                type="submit"
                disabled={salvando || carregando}
              >
                {salvando
                  ? "Salvando…"
                  : editando
                    ? "Salvar alterações"
                    : "Adicionar categoria"}
              </button>
            </div>
          </fieldset>
        </form>

        {erro && (
          <p className="lancamento-erro" role="alert">
            {erro}
          </p>
        )}

        {sucesso && (
          <p className="categorias-sucesso" role="status">
            {sucesso}
          </p>
        )}

        <section
          className="categorias-lista"
          aria-label={`Categorias de ${tipo}`}
        >
          <div className="categorias-lista-titulo">
            <h3>
              {tipo === "despesa"
                ? "Categorias de despesas"
                : "Categorias de receitas"}
            </h3>

            <span>{categoriasFiltradas.length}</span>
          </div>

          {carregando ? (
            <p className="categorias-vazio" role="status">
              Carregando categorias…
            </p>
          ) : categoriasFiltradas.length === 0 ? (
            <p className="categorias-vazio">
              Nenhuma categoria para exibir.
            </p>
          ) : (
            <ul>
              {categoriasFiltradas.map((categoria) => (
                <li key={categoria.id}>
                  <div className="categoria-info">
                    <span className="categoria-nome">
                      {categoria.nome}
                    </span>

                    <span
                      className={`status ${
                        categoria.ativo ? "efetivado" : "cancelado"
                      }`}
                    >
                      {categoria.ativo ? "Ativa" : "Inativa"}
                    </span>
                  </div>

                  <div className="categoria-acoes">
                    <button
                      type="button"
                      disabled={salvando}
                      onClick={() => editar(categoria)}
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      disabled={salvando || Boolean(editando)}
                      onClick={() => alternarAtivo(categoria)}
                    >
                      {categoria.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </dialog>
    </>
  );
}