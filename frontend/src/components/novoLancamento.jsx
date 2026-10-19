import { useEffect, useRef, useState } from "react";
import { consultarApi, criarLancamento } from "../services/api";
import "./NovoLancamento.css";

function hojeLocal() {
    const hoje = new Date();

    return [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0"),
    ].join("-");
}

function dadosIniciais() {
    const hoje = hojeLocal();

    return {
        descricao: "",
        tipo: "despesa",
        valor: "",
        categoria_id: "",
        data_competencia: hoje,
        data_vencimento: hoje,
        data_efetivacao: "",
        status: "pendente",
        forma_pagamento: "pix",
        observacao: "",
    };
}

export default function NovoLancamento() {
    const dialogRef = useRef(null);
    const enviandoRef = useRef(false);

    const [aberto, setAberto] = useState(false);
    const [dados, setDados] = useState(dadosIniciais);
    const [categorias, setCategorias] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");
    const [erroCategorias, setErroCategorias] = useState("");
    const [sucesso, setSucesso] = useState("");

    useEffect(() => {
        if (!aberto) {
            return undefined;
        }

        const controller = new AbortController();

        async function carregarCategorias() {
            try {
                const todas = [];
                let offset = 0;

                while (true) {
                    const pagina = await consultarApi(
                        "/categorias",
                        { ativo: true, offset, limit: 100 },
                        controller.signal,
                    );

                    todas.push(...pagina);

                    if (pagina.length < 100) {
                        break;
                    }

                    offset += 100;
                }

                if (!controller.signal.aborted) {
                    setCategorias(todas);
                }
            } catch (falha) {
                if (!controller.signal.aborted) {
                    setErroCategorias(
                        falha instanceof TypeError
                            ? "Não foi possível carregar as categorias. Confira a API."
                            : falha.message,
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setCarregando(false);
                }
            }
        }

        carregarCategorias();

        return () => controller.abort();
    }, [aberto]);

    function abrir() {
        setDados(dadosIniciais());
        setCategorias([]);
        setErro("");
        setErroCategorias("");
        setSucesso("");
        setCarregando(true);
        setAberto(true);
        dialogRef.current.showModal();
    }

    function fechar() {
        if (!enviandoRef.current) {
            dialogRef.current.close();
        }
    }

    function alterar(evento) {
        const { name, value } = evento.target;

        setDados((atual) => {
            const proximo = { ...atual, [name]: value };

            if (name === "tipo") {
                proximo.categoria_id = "";
            }

            if (name === "status") {
                proximo.data_efetivacao =
                    value === "efetivado"
                        ? atual.data_efetivacao || hojeLocal()
                        : "";
            }

            return proximo;
        });

        setErro("");
    }

    async function salvar(evento) {
        evento.preventDefault();

        if (enviandoRef.current) {
            return;
        }

        const entrada = dados.valor.trim();

        const formatoValido =
            /^\d+(?:[,.]\d{1,2})?$/.test(entrada) ||
            /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(entrada);

        if (!formatoValido) {
            setErro("Informe um valor como 1800,00 ou 1.800,00.");
            return;
        }

        const valor = entrada.includes(",")
            ? entrada.replaceAll(".", "").replace(",", ".")
            : /^\d{1,3}(?:\.\d{3})+$/.test(entrada)
                ? entrada.replaceAll(".", "")
                : entrada;
        if (!/^\d{1,12}(\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) {
            setErro("Informe um valor positivo com até duas casas decimais.");
            return;
        }

        if (!dados.descricao.trim()) {
            setErro("Informe a descrição.");
            return;
        }

        if (!dados.categoria_id) {
            setErro("Selecione uma categoria.");
            return;
        }

        enviandoRef.current = true;
        setSalvando(true);
        setErro("");

        try {
            await criarLancamento({
                ...dados,
                descricao: dados.descricao.trim(),
                valor,
                categoria_id: Number(dados.categoria_id),
                data_efetivacao:
                    dados.status === "efetivado"
                        ? dados.data_efetivacao
                        : null,
                observacao: dados.observacao.trim() || null,
            });

            const competencia = dados.data_competencia
                .split("-")
                .reverse()
                .join("/");

            setSucesso(
                `Lançamento salvo em ${competencia}. Clique em Atualizar no painel para consultar os novos totais.`,
            );

            dialogRef.current.close();
        } catch (falha) {
            setErro(
                falha instanceof TypeError
                    ? "Não foi possível confirmar o cadastro. Consulte os lançamentos antes de tentar novamente."
                    : falha.message,
            );
        } finally {
            enviandoRef.current = false;
            setSalvando(false);
        }
    }

    const categoriasDisponiveis = categorias.filter(
        (categoria) => categoria.tipo === dados.tipo,
    );

    return (
        <>
            <button className="novo-lancamento-botao" onClick={abrir}>
                <span aria-hidden="true" style={{ fontSize: "18px", lineHeight: 1, transform: "translateY(-3px)" }}>+</span>
                Novo lançamento
            </button>

            {sucesso && (
                <div className="lancamento-sucesso" role="status">
                    <span>{sucesso}</span>
                    <button
                        type="button"
                        aria-label="Fechar aviso"
                        onClick={() => setSucesso("")}
                    >
                        ×
                    </button>
                </div>
            )}

            <dialog
                ref={dialogRef}
                className="lancamento-dialog"
                aria-labelledby="titulo-lancamento"
                onClose={() => setAberto(false)}
                onCancel={(evento) => {
                    if (enviandoRef.current) {
                        evento.preventDefault();
                    }
                }}
            >
                <div className="lancamento-cabecalho">
                    <div>
                        <span className="sobretitulo">CADASTRO</span>
                        <h2 id="titulo-lancamento">Novo lançamento</h2>
                    </div>

                    <button
                        className="lancamento-fechar"
                        type="button"
                        aria-label="Fechar formulário"
                        disabled={salvando}
                        onClick={fechar}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={salvar}>
                    <fieldset className="lancamento-campos" disabled={salvando}>
                        <div className="lancamento-tipos">
                            <button
                                type="button"
                                aria-pressed={dados.tipo === "despesa"}
                                className={dados.tipo === "despesa" ? "selecionado" : ""}
                                onClick={() => {
                                    setDados((atual) => ({
                                        ...atual,
                                        tipo: "despesa",
                                        categoria_id: "",
                                    }));
                                }}
                            >
                                Despesa
                            </button>

                            <button
                                type="button"
                                aria-pressed={dados.tipo === "receita"}
                                className={dados.tipo === "receita" ? "selecionado" : ""}
                                onClick={() => {
                                    setDados((atual) => ({
                                        ...atual,
                                        tipo: "receita",
                                        categoria_id: "",
                                    }));
                                }}
                            >
                                Receita
                            </button>
                        </div>

                        <div className="lancamento-grid">
                            <label className="campo-inteiro">
                                Descrição
                                <input
                                    name="descricao"
                                    value={dados.descricao}
                                    onChange={alterar}
                                    maxLength={200}
                                    placeholder="Ex.: Mercado, salário, internet"
                                    required
                                    autoFocus
                                />
                            </label>

                            <label>
                                Valor
                                <input
                                    name="valor"
                                    value={dados.valor}
                                    onChange={alterar}
                                    inputMode="decimal"
                                    placeholder="0,00"
                                    required
                                />
                            </label>

                            <label>
                                Categoria
                                <select
                                    name="categoria_id"
                                    value={dados.categoria_id}
                                    onChange={alterar}
                                    disabled={carregando || Boolean(erroCategorias)}
                                    required
                                >
                                    <option value="">
                                        {carregando ? "Carregando…" : "Selecione"}
                                    </option>
                                    {categoriasDisponiveis.map((categoria) => (
                                        <option key={categoria.id} value={categoria.id}>
                                            {categoria.nome}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {!carregando &&
                                !erroCategorias &&
                                categoriasDisponiveis.length === 0 && (
                                    <p className="lancamento-aviso campo-inteiro">
                                        Nenhuma categoria ativa de {dados.tipo}. Cadastre uma
                                        categoria desse tipo na API antes de salvar.
                                    </p>
                                )}

                            <label>
                                Entrada
                                <input
                                    type="date"
                                    name="data_competencia"
                                    value={dados.data_competencia}
                                    onChange={alterar}
                                    required
                                />
                            </label>

                            <label>
                                {dados.tipo === "receita"
                                    ? "Previsão de recebimento"
                                    : "Vencimento"}
                                <input
                                    type="date"
                                    name="data_vencimento"
                                    value={dados.data_vencimento}
                                    onChange={alterar}
                                    required
                                />
                            </label>

                            <label>
                                Status
                                <select
                                    name="status"
                                    value={dados.status}
                                    onChange={alterar}
                                >
                                    <option value="pendente">Pendente</option>
                                    <option value="efetivado">
                                        {dados.tipo === "receita" ? "Recebido" : "Pago"}
                                    </option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                            </label>

                            <label>
                                Forma de pagamento
                                <select
                                    name="forma_pagamento"
                                    value={dados.forma_pagamento}
                                    onChange={alterar}
                                >
                                    <option value="pix">Pix</option>
                                    <option value="debito">Débito</option>
                                    <option value="dinheiro">Dinheiro</option>
                                    <option value="transferencia">Transferência</option>
                                    <option value="boleto">Boleto</option>
                                </select>
                            </label>

                            {dados.status === "efetivado" && (
                                <label className="campo-inteiro">
                                    {dados.tipo === "receita"
                                        ? "Data do recebimento"
                                        : "Data do pagamento"}
                                    <input
                                        type="date"
                                        name="data_efetivacao"
                                        value={dados.data_efetivacao}
                                        onChange={alterar}
                                        required
                                    />
                                </label>
                            )}

                            <label className="campo-inteiro">
                                Observação
                                <textarea
                                    name="observacao"
                                    value={dados.observacao}
                                    onChange={alterar}
                                    placeholder="Opcional"
                                    rows={3}
                                />
                            </label>
                        </div>
                    </fieldset>

                    {(erro || erroCategorias) && (
                        <p className="lancamento-erro" role="alert">
                            {erro || erroCategorias}
                        </p>
                    )}

                    <div className="lancamento-acoes">
                        <button
                            type="button"
                            className="lancamento-cancelar"
                            disabled={salvando}
                            onClick={fechar}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="lancamento-salvar"
                            disabled={
                                salvando ||
                                carregando ||
                                Boolean(erroCategorias) ||
                                categoriasDisponiveis.length === 0
                            }
                        >
                            {salvando ? "Salvando…" : "Salvar lançamento"}
                        </button>
                    </div>
                </form>
            </dialog>
        </>
    );
}