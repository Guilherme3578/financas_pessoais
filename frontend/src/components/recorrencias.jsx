import { useEffect, useRef, useState } from "react";
import { listarCategorias } from "../services/categorias";
import {
  alterarSituacaoRecorrencia,
  criarRecorrencia,
  gerarRecorrencia,
  listarRecorrencias,
} from "../services/recorrencias";

import "./NovoLancamento.css";
import "./Recorrencias.css";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function mesAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(
    hoje.getMonth() + 1,
  ).padStart(2, "0")}`;
}

function dadosIniciais() {
  return {
    descricao: "",
    tipo: "despesa",
    valor: "",
    categoria_id: "",
    dia_vencimento: "10",
    competencia_inicio: mesAtual(),
    competencia_fim: "",
    forma_pagamento: "pix",
    observacao: "",
  };
}

function formatarMes(data) {
  const [ano, mes] = data.split("-");
  return `${mes}/${ano}`;
}

function normalizarValor(entrada) {
  const texto = entrada.trim();

  const valido =
    /^\d+(?:[,.]\d{1,2})?$/.test(texto) ||
    /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(texto);

  if (!valido) {
    return null;
  }

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

export default function Recorrencias() {
  const dialogRef = useRef(null);
  const ocupadoRef = useRef(false);

  const [aberto, setAberto] = useState(false);
  const [tela, setTela] = useState("lista");
  const [itens, setItens] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [dados, setDados] = useState(dadosIniciais);
  const [selecionada, setSelecionada] = useState(null);
  const [ate, setAte] = useState(mesAtual);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [falhaCarga, setFalhaCarga] = useState(false);

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }

    const controller = new AbortController();

    async function carregar() {
      try {
        const [recorrencias, categoriasCarregadas] = await Promise.all([
          listarRecorrencias(controller.signal),
          listarCategorias(controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setItens(recorrencias);
          setCategorias(categoriasCarregadas);
        }
      } catch (falha) {
        if (!controller.signal.aborted) {
          setFalhaCarga(true);
          setErro(
            falha instanceof TypeError
              ? "Não foi possível carregar os dados. Confira a API."
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

  function definirOcupado(valor) {
    ocupadoRef.current = valor;
    setSalvando(valor);
  }

  function abrir() {
    setTela("lista");
    setSelecionada(null);
    setItens([]);
    setCategorias([]);
    setErro("");
    setSucesso("");
    setFalhaCarga(false);
    setCarregando(true);
    setAberto(true);
    dialogRef.current.showModal();
  }

  function fechar() {
    if (!ocupadoRef.current) {
      dialogRef.current.close();
    }
  }

  function voltar() {
    setTela("lista");
    setSelecionada(null);
    setErro("");
  }

  function nova() {
    setDados(dadosIniciais());
    setErro("");
    setSucesso("");
    setTela("cadastro");
  }

  function alterar(evento) {
    const { name, value } = evento.target;

    setDados((atual) => ({
      ...atual,
      [name]: value,
      ...(name === "tipo" ? { categoria_id: "" } : {}),
    }));

    setErro("");
  }

  function prepararGeracao(item) {
    const inicio = item.competencia_inicio.slice(0, 7);
    const fim = item.competencia_fim?.slice(0, 7);
    const atual = mesAtual();

    let mes = atual < inicio ? inicio : atual;

    if (fim && mes > fim) {
      mes = fim;
    }

    setSelecionada(item);
    setAte(mes);
    setErro("");
    setSucesso("");
    setTela("gerar");
  }

  function erroOperacao(falha) {
    return falha instanceof TypeError
      ? "Não foi possível confirmar a operação. Feche e reabra a lista para conferir antes de tentar novamente."
      : falha.message;
  }

  async function cadastrar(evento) {
    evento.preventDefault();

    if (ocupadoRef.current) {
      return;
    }

    const valor = normalizarValor(dados.valor);

    if (!dados.descricao.trim()) {
      setErro("Informe a descrição.");
      return;
    }

    if (!valor) {
      setErro("Informe um valor positivo, como 99,90 ou 1.800,00.");
      return;
    }

    if (
      dados.competencia_fim &&
      dados.competencia_fim < dados.competencia_inicio
    ) {
      setErro("O mês final não pode ser anterior ao inicial.");
      return;
    }

    definirOcupado(true);
    setErro("");

    try {
      const criada = await criarRecorrencia({
        ...dados,
        descricao: dados.descricao.trim(),
        valor,
        categoria_id: Number(dados.categoria_id),
        dia_vencimento: Number(dados.dia_vencimento),
        competencia_inicio: `${dados.competencia_inicio}-01`,
        competencia_fim: dados.competencia_fim
          ? `${dados.competencia_fim}-01`
          : null,
        observacao: dados.observacao.trim() || null,
      });

      setItens((atuais) => [criada, ...atuais]);
      setTela("lista");
      setSucesso(
        "Recorrência cadastrada. Clique em Gerar para criar os lançamentos.",
      );
    } catch (falha) {
      setErro(erroOperacao(falha));
    } finally {
      definirOcupado(false);
    }
  }

  async function alternar(item) {
    if (ocupadoRef.current) {
      return;
    }

    definirOcupado(true);
    setErro("");
    setSucesso("");

    try {
      const atualizada = await alterarSituacaoRecorrencia(
        item.id,
        !item.ativo,
      );

      setItens((atuais) =>
        atuais.map((atual) =>
          atual.id === atualizada.id ? atualizada : atual,
        ),
      );

      setSucesso(
        atualizada.ativo
          ? "Recorrência retomada. Use Gerar para criar os meses desejados."
          : "Recorrência pausada. Os lançamentos existentes foram mantidos.",
      );
    } catch (falha) {
      setErro(erroOperacao(falha));
    } finally {
      definirOcupado(false);
    }
  }

  async function gerar(evento) {
    evento.preventDefault();

    if (ocupadoRef.current || !selecionada) {
      return;
    }

    definirOcupado(true);
    setErro("");

    try {
      const resultado = await gerarRecorrencia(
        selecionada.id,
        `${ate}-01`,
      );

      setSucesso(
        `${resultado.gerados} lançamento(s) criado(s). ` +
        `${resultado.meses_ja_processados} mês(es) já processado(s).`,
      );

      setTela("lista");
      setSelecionada(null);
    } catch (falha) {
      setErro(erroOperacao(falha));
    } finally {
      definirOcupado(false);
    }
  }

  const categoriasDisponiveis = categorias.filter(
    (categoria) => categoria.ativo && categoria.tipo === dados.tipo,
  );

  const nomesCategorias = new Map(
    categorias.map((categoria) => [categoria.id, categoria.nome]),
  );

  return (
    <>
      <button
        type="button"
        className="recorrencias-abrir"
        onClick={abrir}
      >
        Recorrências
      </button>

      <dialog
        ref={dialogRef}
        className="lancamento-dialog recorrencias-dialog"
        aria-labelledby="titulo-recorrencias"
        onClose={() => setAberto(false)}
        onCancel={(evento) => {
          if (ocupadoRef.current) {
            evento.preventDefault();
          }
        }}
      >
        <div className="lancamento-cabecalho">
          <div>
            <span className="sobretitulo">TODO MÊS</span>
            <h2 id="titulo-recorrencias">
              {tela === "cadastro"
                ? "Nova recorrência"
                : tela === "gerar"
                  ? "Gerar lançamentos"
                  : "Recorrências"}
            </h2>
          </div>

          <button
            type="button"
            className="lancamento-fechar"
            aria-label="Fechar recorrências"
            disabled={salvando}
            onClick={fechar}
          >
            ×
          </button>
        </div>

        {erro && (
          <p className="lancamento-erro" role="alert">
            {erro}
          </p>
        )}

        {sucesso && (
          <p className="recorrencias-sucesso" role="status">
            {sucesso}
          </p>
        )}

        {tela === "cadastro" ? (
          <form onSubmit={cadastrar}>
            <fieldset className="lancamento-campos" disabled={salvando}>
              <div className="lancamento-grid">
                <label>
                  Tipo
                  <select
                    name="tipo"
                    value={dados.tipo}
                    onChange={alterar}
                  >
                    <option value="despesa">Despesa</option>
                    <option value="receita">Receita</option>
                  </select>
                </label>

                <label>
                  Valor mensal
                  <input
                    name="valor"
                    value={dados.valor}
                    onChange={alterar}
                    inputMode="decimal"
                    placeholder="0,00"
                    required
                  />
                </label>

                <label className="campo-inteiro">
                  Descrição
                  <input
                    name="descricao"
                    value={dados.descricao}
                    onChange={alterar}
                    maxLength={200}
                    placeholder="Ex.: Salário, aluguel, internet"
                    required
                  />
                </label>

                <label className="campo-inteiro">
                  Categoria
                  <select
                    name="categoria_id"
                    value={dados.categoria_id}
                    onChange={alterar}
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

                {categoriasDisponiveis.length === 0 && (
                  <p className="lancamento-aviso campo-inteiro">
                    Cadastre uma categoria ativa de {dados.tipo} antes
                    de continuar.
                  </p>
                )}

                <label>
                  {dados.tipo === "receita"
                    ? "Dia previsto de recebimento"
                    : "Dia do vencimento"}
                  <input
                    type="number"
                    name="dia_vencimento"
                    value={dados.dia_vencimento}
                    onChange={alterar}
                    min="1"
                    max="31"
                    step="1"
                    required
                  />
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

                <label>
                  Mês inicial
                  <input
                    type="month"
                    name="competencia_inicio"
                    value={dados.competencia_inicio}
                    onChange={alterar}
                    min="1900-01"
                    max="9999-12"
                    required
                  />
                </label>

                <label>
                  Mês final — opcional
                  <input
                    type="month"
                    name="competencia_fim"
                    value={dados.competencia_fim}
                    onChange={alterar}
                    min={dados.competencia_inicio || "1900-01"}
                    max="9999-12"
                  />
                </label>

                <label className="campo-inteiro">
                  Observação
                  <textarea
                    name="observacao"
                    value={dados.observacao}
                    onChange={alterar}
                    rows={3}
                    placeholder="Opcional"
                  />
                </label>
              </div>
            </fieldset>

            <p className="recorrencias-nota">
              Nos meses sem o dia escolhido, será usado o último dia.
            </p>

            <div className="lancamento-acoes">
              <button
                type="button"
                className="lancamento-cancelar"
                disabled={salvando}
                onClick={voltar}
              >
                Voltar
              </button>

              <button
                type="submit"
                className="lancamento-salvar"
                disabled={salvando || categoriasDisponiveis.length === 0}
              >
                {salvando ? "Salvando…" : "Cadastrar"}
              </button>
            </div>
          </form>
        ) : tela === "gerar" && selecionada ? (
          <form onSubmit={gerar}>
            <div className="recorrencias-destaque">
              <strong>{selecionada.descricao}</strong>
              <span>{moeda.format(selecionada.valor)} por mês</span>
              <span>
                A partir de {formatarMes(selecionada.competencia_inicio)}
              </span>
            </div>

            <div className="lancamento-grid">
              <label className="campo-inteiro">
                Gerar até
                <input
                  type="month"
                  value={ate}
                  onChange={(evento) => setAte(evento.target.value)}
                  min={selecionada.competencia_inicio.slice(0, 7)}
                  max={
                    selecionada.competencia_fim?.slice(0, 7) ||
                    "9999-12"
                  }
                  disabled={salvando}
                  required
                />
              </label>
            </div>

            <p className="recorrencias-nota">
              Serão criados lançamentos pendentes desde o mês inicial
              até o mês escolhido. Meses já processados serão ignorados.
              A competência fica no primeiro dia de cada mês.
            </p>

            <div className="lancamento-acoes">
              <button
                type="button"
                className="lancamento-cancelar"
                disabled={salvando}
                onClick={voltar}
              >
                Voltar
              </button>

              <button
                type="submit"
                className="lancamento-salvar"
                disabled={salvando}
              >
                {salvando ? "Gerando…" : "Gerar lançamentos"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="recorrencias-topo">
              <p>Receitas e despesas que se repetem mensalmente.</p>

              <button
                type="button"
                className="recorrencias-nova"
                disabled={carregando || salvando || falhaCarga}
                onClick={nova}
              >
                Nova recorrência
              </button>
            </div>

            {carregando ? (
              <p className="recorrencias-vazio" role="status">
                Carregando…
              </p>
            ) : falhaCarga ? (
              <p className="recorrencias-vazio">
                Feche e abra esta janela para tentar novamente.
              </p>
            ) : itens.length === 0 ? (
              <p className="recorrencias-vazio">
                Nenhuma recorrência cadastrada.
              </p>
            ) : (
              <ul className="recorrencias-lista">
                {itens.map((item) => (
                  <li key={item.id}>
                    <div className="recorrencias-info">
                      <strong>{item.descricao}</strong>

                      <span>
                        {item.tipo === "receita" ? "Receita" : "Despesa"}
                        {" · "}
                        {nomesCategorias.get(item.categoria_id) ||
                          `Categoria #${item.categoria_id}`}
                      </span>

                      <span>
                        {item.tipo === "receita"
                          ? "Recebimento previsto"
                          : "Vencimento"}
                        {" no dia "}
                        {item.dia_vencimento}
                      </span>

                      <span>
                        {formatarMes(item.competencia_inicio)}
                        {" — "}
                        {item.competencia_fim
                          ? formatarMes(item.competencia_fim)
                          : "sem mês final"}
                      </span>

                      <span
                        className={`status ${
                          item.ativo ? "efetivado" : "cancelado"
                        }`}
                      >
                        {item.ativo ? "Ativa" : "Pausada"}
                      </span>
                    </div>

                    <div className="recorrencias-lateral">
                      <strong
                        className={
                          item.tipo === "receita"
                            ? "texto-positivo"
                            : "texto-negativo"
                        }
                      >
                        {moeda.format(item.valor)}
                      </strong>

                      <div className="recorrencias-botoes">
                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() => alternar(item)}
                        >
                          {item.ativo ? "Pausar" : "Retomar"}
                        </button>

                        <button
                          type="button"
                          className="recorrencias-gerar"
                          disabled={salvando || !item.ativo}
                          onClick={() => prepararGeracao(item)}
                        >
                          Gerar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="recorrencias-nota">
              Pausar impede novas gerações. Os lançamentos já criados
              continuam disponíveis em Lançamentos.
            </p>
          </>
        )}
      </dialog>
    </>
  );
}