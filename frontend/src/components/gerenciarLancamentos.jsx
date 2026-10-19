import { useEffect, useRef, useState } from "react";
import { consultarApi } from "../services/api";
import { listarCategorias } from "../services/categorias";
import {
    efetivarLancamento,
    excluirLancamento,
} from "../services/lancamentos";
import EditarLancamento from "./editarLancamento";

import "./NovoLancamento.css";
import "./GerenciarLancamentos.css";
import "./FiltrosLancamentos.css";

const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
});

const statusNomes = {
    pendente: "Pendente",
    efetivado: "Efetivado",
    cancelado: "Cancelado",
};

function filtrosIniciais() {
    return {
        tipo: "",
        status: "",
        categoria_id: "",
        competencia_inicio: "",
        competencia_fim: "",
    };
}

function hojeLocal() {
    const hoje = new Date();

    return [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0"),
    ].join("-");
}

function dataFormatada(data) {
    return data.split("-").reverse().join("/");
}

export default function GerenciarLancamentos() {
    const dialogRef = useRef(null);
    const ocupadoRef = useRef(false);

    const [aberto, setAberto] = useState(false);
    const [pagina, setPagina] = useState(0);
    const [versao, setVersao] = useState(0);
    const [itens, setItens] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [rascunho, setRascunho] = useState(filtrosIniciais);
    const [filtros, setFiltros] = useState(filtrosIniciais);
    const [carregando, setCarregando] = useState(false);
    const [carregandoCategorias, setCarregandoCategorias] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");
    const [erroCategorias, setErroCategorias] = useState("");
    const [erroFiltro, setErroFiltro] = useState("");
    const [aviso, setAviso] = useState("");
    const [acao, setAcao] = useState(null);
    const [data, setData] = useState(hojeLocal);

    useEffect(() => {
        if (!aberto) {
            return undefined;
        }

        const controller = new AbortController();

        async function carregarCategorias() {
            try {
                const resultado = await listarCategorias(controller.signal);

                if (!controller.signal.aborted) {
                    setCategorias(resultado);
                }
            } catch (falha) {
                if (!controller.signal.aborted) {
                    setErroCategorias(
                        falha instanceof TypeError
                            ? "Não foi possível carregar o filtro de categorias."
                            : falha.message,
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setCarregandoCategorias(false);
                }
            }
        }

        carregarCategorias();

        return () => controller.abort();
    }, [aberto]);

    useEffect(() => {
        if (!aberto) {
            return undefined;
        }

        const controller = new AbortController();

        async function carregar() {
            try {
                const resultado = await consultarApi(
                    "/lancamentos",
                    {
                        ...filtros,
                        offset: pagina * 10,
                        limit: 10,
                    },
                    controller.signal,
                );

                if (!controller.signal.aborted) {
                    setItens(resultado);
                }
            } catch (falha) {
                if (!controller.signal.aborted) {
                    setErro(
                        falha instanceof TypeError
                            ? "Não foi possível carregar os lançamentos."
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
    }, [aberto, pagina, filtros, versao]);

    function definirOcupado(valor) {
        ocupadoRef.current = valor;
        setSalvando(valor);
    }

    function abrir() {
        setPagina(0);
        setRascunho(filtrosIniciais());
        setFiltros(filtrosIniciais());
        setItens([]);
        setCategorias([]);
        setErro("");
        setErroCategorias("");
        setErroFiltro("");
        setAviso("");
        setAcao(null);
        setCarregando(true);
        setCarregandoCategorias(true);
        setAberto(true);
        dialogRef.current.showModal();
    }

    function fechar() {
        if (!ocupadoRef.current) {
            dialogRef.current.close();
        }
    }

    function alterarFiltro(evento) {
        const { name, value } = evento.target;

        setRascunho((atual) => ({
            ...atual,
            [name]: value,
            ...(name === "tipo" ? { categoria_id: "" } : {}),
        }));

        setErroFiltro("");
    }

    function aplicarFiltros(evento) {
        evento.preventDefault();

        if (
            rascunho.competencia_inicio &&
            rascunho.competencia_fim &&
            rascunho.competencia_inicio > rascunho.competencia_fim
        ) {
            setErroFiltro("A data inicial não pode ser posterior à final.");
            return;
        }

        setErro("");
        setErroFiltro("");
        setAviso("");
        setCarregando(true);
        setPagina(0);
        setFiltros({ ...rascunho });
    }

    function limparFiltros() {
        setRascunho(filtrosIniciais());
        setFiltros(filtrosIniciais());
        setPagina(0);
        setErro("");
        setErroFiltro("");
        setAviso("");
        setCarregando(true);
    }

    function mudarPagina(proxima) {
        setCarregando(true);
        setErro("");
        setAcao(null);
        setPagina(proxima);
    }

    function prepararAcao(tipo, item) {
        setErro("");
        setAviso("");
        setData(hojeLocal());
        setAcao({ tipo, item });
    }

    function atualizarLista(mensagem) {
        setAcao(null);
        setErro("");
        setAviso(mensagem);
        setCarregando(true);
        setPagina(0);
        setVersao((atual) => atual + 1);
    }

    async function confirmar(evento) {
        evento.preventDefault();

        if (!acao || ocupadoRef.current) {
            return;
        }

        definirOcupado(true);
        setErro("");

        try {
            if (acao.tipo === "excluir") {
                await excluirLancamento(acao.item.id);
                atualizarLista("Lançamento excluído.");
            } else {
                await efetivarLancamento(acao.item.id, data);
                atualizarLista("Lançamento efetivado.");
            }
        } catch (falha) {
            setErro(
                falha instanceof TypeError
                    ? "Não foi possível confirmar a operação. Reabra a lista antes de tentar novamente."
                    : falha.message,
            );
        } finally {
            definirOcupado(false);
        }
    }

    const categoriasDisponiveis = categorias.filter(
        (categoria) => !rascunho.tipo || categoria.tipo === rascunho.tipo,
    );

    const nomesCategorias = new Map(
        categorias.map((categoria) => [categoria.id, categoria.nome]),
    );

    const temFiltros = Object.values(filtros).some(Boolean);

    return (
        <>
            <button
                className="gerenciar-abrir"
                type="button"
                onClick={abrir}
            >
                Lançamentos
            </button>

            <dialog
                ref={dialogRef}
                className="lancamento-dialog gerenciar-dialog"
                aria-labelledby="titulo-gerenciar"
                onClose={() => setAberto(false)}
                onCancel={(evento) => {
                    if (ocupadoRef.current) {
                        evento.preventDefault();
                    }
                }}
            >
                <div className="lancamento-cabecalho">
                    <div>
                        <span className="sobretitulo">MOVIMENTAÇÕES</span>
                        <h2 id="titulo-gerenciar">
                            {acao?.tipo === "editar"
                                ? "Editar lançamento"
                                : "Lançamentos"}
                        </h2>
                    </div>

                    <button
                        className="lancamento-fechar"
                        type="button"
                        aria-label="Fechar lançamentos"
                        disabled={salvando}
                        onClick={fechar}
                    >
                        ×
                    </button>
                </div>

                {aviso && (
                    <p className="gerenciar-aviso" role="status">
                        {aviso}
                    </p>
                )}

                {erro && (
                    <p className="lancamento-erro" role="alert">
                        {erro}
                    </p>
                )}

                {acao?.tipo === "editar" ? (
                    <EditarLancamento
                        key={acao.item.id}
                        lancamento={acao.item}
                        onOcupado={definirOcupado}
                        onCancelar={() => setAcao(null)}
                        onSalvo={() => atualizarLista("Alterações salvas.")}
                    />
                ) : acao ? (
                    <form className="gerenciar-confirmacao" onSubmit={confirmar}>
                        <h3>
                            {acao.tipo === "excluir"
                                ? "Excluir lançamento?"
                                : acao.item.tipo === "receita"
                                    ? "Confirmar recebimento"
                                    : "Confirmar pagamento"}
                        </h3>

                        <p>
                            {acao.item.descricao} · {moeda.format(acao.item.valor)}
                        </p>

                        {acao.tipo === "excluir" ? (
                            <p>O registro será removido permanentemente.</p>
                        ) : (
                            <div className="lancamento-grid">
                                <label className="campo-inteiro">
                                    {acao.item.tipo === "receita"
                                        ? "Data do recebimento"
                                        : "Data do pagamento"}
                                    <input
                                        type="date"
                                        value={data}
                                        onChange={(evento) => setData(evento.target.value)}
                                        disabled={salvando}
                                        required
                                    />
                                </label>
                            </div>
                        )}

                        <div className="lancamento-acoes">
                            <button
                                type="button"
                                className="lancamento-cancelar"
                                disabled={salvando}
                                onClick={() => {
                                    setAcao(null);
                                    setErro("");
                                }}
                            >
                                Voltar
                            </button>

                            <button
                                type="submit"
                                className={
                                    acao.tipo === "excluir"
                                        ? "gerenciar-excluir-confirmar"
                                        : "lancamento-salvar"
                                }
                                disabled={salvando}
                            >
                                {salvando
                                    ? "Salvando…"
                                    : acao.tipo === "excluir"
                                        ? "Excluir"
                                        : "Confirmar"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <form
                            className="filtros-lancamentos"
                            onSubmit={aplicarFiltros}
                        >
                            <div className="filtros-lancamentos-grid">
                                <label>
                                    Tipo
                                    <select
                                        name="tipo"
                                        value={rascunho.tipo}
                                        onChange={alterarFiltro}
                                    >
                                        <option value="">Todos</option>
                                        <option value="despesa">Despesas</option>
                                        <option value="receita">Receitas</option>
                                    </select>
                                </label>

                                <label>
                                    Status
                                    <select
                                        name="status"
                                        value={rascunho.status}
                                        onChange={alterarFiltro}
                                    >
                                        <option value="">Todos</option>
                                        <option value="pendente">Pendentes</option>
                                        <option value="efetivado">Efetivados</option>
                                        <option value="cancelado">Cancelados</option>
                                    </select>
                                </label>

                                <label className="filtro-categoria">
                                    Categoria
                                    <select
                                        name="categoria_id"
                                        value={rascunho.categoria_id}
                                        onChange={alterarFiltro}
                                        disabled={
                                            carregandoCategorias || Boolean(erroCategorias)
                                        }
                                    >
                                        <option value="">
                                            {carregandoCategorias ? "Carregando…" : "Todas"}
                                        </option>

                                        {categoriasDisponiveis.map((categoria) => (
                                            <option key={categoria.id} value={categoria.id}>
                                                {categoria.nome}
                                                {!rascunho.tipo
                                                    ? ` — ${categoria.tipo === "receita" ? "Receita" : "Despesa"}`
                                                    : ""}
                                                {!categoria.ativo ? " (inativa)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    Competência inicial
                                    <input
                                        type="date"
                                        name="competencia_inicio"
                                        value={rascunho.competencia_inicio}
                                        onChange={alterarFiltro}
                                    />
                                </label>

                                <label>
                                    Competência final
                                    <input
                                        type="date"
                                        name="competencia_fim"
                                        value={rascunho.competencia_fim}
                                        onChange={alterarFiltro}
                                    />
                                </label>
                            </div>

                            {erroCategorias && (
                                <p className="filtros-lancamentos-erro" role="alert">
                                    {erroCategorias}
                                </p>
                            )}

                            {erroFiltro && (
                                <p className="filtros-lancamentos-erro" role="alert">
                                    {erroFiltro}
                                </p>
                            )}

                            <div className="filtros-lancamentos-acoes">
                                <button
                                    type="button"
                                    className="filtro-limpar"
                                    onClick={limparFiltros}
                                    disabled={carregando}
                                >
                                    Limpar
                                </button>

                                <button
                                    type="submit"
                                    className="filtro-aplicar"
                                    disabled={carregando}
                                >
                                    {carregando ? "Buscando…" : "Aplicar filtros"}
                                </button>
                            </div>
                        </form>

                        <div className="filtros-lancamentos-resumo">
                            <span>{temFiltros ? "Lista filtrada" : "Todos os lançamentos"}</span>
                            <span>
                                {carregando ? "Carregando…" : `${itens.length} nesta página`}
                            </span>
                        </div>

                        {carregando ? (
                            <p className="categorias-vazio" role="status">
                                Carregando lançamentos…
                            </p>
                        ) : itens.length === 0 ? (
                            <p className="categorias-vazio">
                                Nenhum lançamento encontrado.
                            </p>
                        ) : (
                            <ul className="gerenciar-lista">
                                {itens.map((item) => (
                                    <li key={item.id}>
                                        <div className="gerenciar-item-info">
                                            <strong>{item.descricao}</strong>

                                            <span>
                                                {item.tipo === "receita" ? "Receita" : "Despesa"}
                                                {" · "}
                                                {nomesCategorias.get(item.categoria_id) ||
                                                    `Categoria #${item.categoria_id}`}
                                            </span>

                                            <span>
                                                Competência: {dataFormatada(item.data_competencia)}
                                                {" · "}
                                                {item.tipo === "receita" ? "Recebimento previsto: " : "Vence em "}
                                                {dataFormatada(item.data_vencimento)}
                                            </span>

                                            <span className={`status ${item.status}`}>
                                                {statusNomes[item.status]}
                                            </span>
                                        </div>

                                        <div className="gerenciar-item-acoes">
                                            <strong
                                                className={
                                                    item.tipo === "receita"
                                                        ? "texto-positivo"
                                                        : "texto-negativo"
                                                }
                                            >
                                                {moeda.format(item.valor)}
                                            </strong>

                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() => prepararAcao("editar", item)}
                                                >
                                                    Editar
                                                </button>

                                                {item.status === "pendente" && (
                                                    <button
                                                        type="button"
                                                        className="gerenciar-efetivar"
                                                        onClick={() => prepararAcao("efetivar", item)}
                                                    >
                                                        {item.tipo === "receita" ? "Receber" : "Pagar"}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="gerenciar-excluir"
                                                    onClick={() => prepararAcao("excluir", item)}
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        <div className="gerenciar-paginacao">
                            <button
                                type="button"
                                disabled={pagina === 0 || carregando}
                                onClick={() => mudarPagina(pagina - 1)}
                            >
                                Anterior
                            </button>

                            <span>Página {pagina + 1}</span>

                            <button
                                type="button"
                                disabled={
                                    itens.length < 10 || carregando || Boolean(erro)
                                }
                                onClick={() => mudarPagina(pagina + 1)}
                            >
                                Próxima
                            </button>
                        </div>
                    </>
                )}
            </dialog>
        </>
    );
}