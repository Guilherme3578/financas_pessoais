import { useEffect, useRef, useState } from "react";
import { listarCategorias } from "../services/categorias";
import { atualizarLancamento } from "../services/lancamentos";

function hojeLocal() {
    const hoje = new Date();

    return [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0"),
    ].join("-");
}

export default function EditarLancamento({
    lancamento,
    onCancelar,
    onSalvo,
    onOcupado,
}) {
    const enviandoRef = useRef(false);

    const [dados, setDados] = useState(() => ({
        descricao: lancamento.descricao,
        tipo: lancamento.tipo,
        valor: String(lancamento.valor),
        categoria_id: String(lancamento.categoria_id),
        data_competencia: lancamento.data_competencia,
        data_vencimento: lancamento.data_vencimento,
        data_efetivacao: lancamento.data_efetivacao || "",
        status: lancamento.status,
        forma_pagamento: lancamento.forma_pagamento,
        observacao: lancamento.observacao || "",
    }));

    const [categorias, setCategorias] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [falhaCategorias, setFalhaCategorias] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function carregar() {
            try {
                const resultado = await listarCategorias(controller.signal);

                if (!controller.signal.aborted) {
                    setCategorias(resultado);
                }
            } catch (falha) {
                if (!controller.signal.aborted) {
                    setFalhaCategorias(
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
    }, []);

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

        const valor = dados.valor.trim().replace(",", ".");

        if (!dados.descricao.trim()) {
            setErro("Informe a descrição.");
            return;
        }

        if (!/^\d{1,12}(\.\d{1,2})?$/.test(valor) || Number(valor) <= 0) {
            setErro("Informe um valor positivo com até duas casas decimais.");
            return;
        }

        enviandoRef.current = true;
        setSalvando(true);
        onOcupado(true);
        setErro("");

        let salvo = false;

        try {
            await atualizarLancamento(lancamento.id, {
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

            salvo = true;
        } catch (falha) {
            setErro(
                falha instanceof TypeError
                    ? "Não foi possível confirmar a alteração. Consulte o registro antes de tentar novamente."
                    : falha.message,
            );
        } finally {
            enviandoRef.current = false;
            setSalvando(false);
            onOcupado(false);
        }

        if (salvo) {
            onSalvo();
        }
    }

    const disponiveis = categorias.filter(
        (categoria) =>
            categoria.tipo === dados.tipo &&
            (categoria.ativo || categoria.id === lancamento.categoria_id),
    );

    return (
        <form onSubmit={salvar}>
            <fieldset className="lancamento-campos" disabled={salvando}>
                <div className="lancamento-grid">
                    <label className="campo-inteiro">
                        Descrição
                        <input
                            name="descricao"
                            value={dados.descricao}
                            onChange={alterar}
                            maxLength={200}
                            required
                        />
                    </label>

                    <label>
                        Tipo
                        <select name="tipo" value={dados.tipo} onChange={alterar}>
                            <option value="despesa">Despesa</option>
                            <option value="receita">Receita</option>
                        </select>
                    </label>

                    <label>
                        Valor
                        <input
                            name="valor"
                            value={dados.valor}
                            onChange={alterar}
                            inputMode="decimal"
                            required
                        />
                    </label>

                    <label className="campo-inteiro">
                        Categoria
                        <select
                            name="categoria_id"
                            value={dados.categoria_id}
                            onChange={alterar}
                            disabled={carregando || Boolean(falhaCategorias)}
                            required
                        >
                            <option value="">
                                {carregando ? "Carregando…" : "Selecione"}
                            </option>

                            {disponiveis.map((categoria) => (
                                <option key={categoria.id} value={categoria.id}>
                                    {categoria.nome}
                                    {!categoria.ativo ? " (inativa — atual)" : ""}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Competência
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
                        <select name="status" value={dados.status} onChange={alterar}>
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
                            rows={3}
                        />
                    </label>
                </div>
            </fieldset>

            {(erro || falhaCategorias) && (
                <p className="lancamento-erro" role="alert">
                    {erro || falhaCategorias}
                </p>
            )}

            <div className="lancamento-acoes">
                <button
                    type="button"
                    className="lancamento-cancelar"
                    onClick={onCancelar}
                    disabled={salvando}
                >
                    Voltar
                </button>

                <button
                    type="submit"
                    className="lancamento-salvar"
                    disabled={salvando || carregando || Boolean(falhaCategorias)}
                >
                    {salvando ? "Salvando…" : "Salvar alterações"}
                </button>
            </div>
        </form>
    );
}