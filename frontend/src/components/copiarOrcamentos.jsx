import { useRef, useState } from "react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

function mesAnterior(mes) {
  const [ano, numeroMes] = mes.split("-").map(Number);
  const data = new Date(ano, numeroMes - 2, 1, 12);

  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export default function CopiarOrcamentos({
  destino,
  desabilitado,
  onCopiado,
  onOcupado,
}) {
  const ocupadoRef = useRef(false);

  const [expandido, setExpandido] = useState(false);
  const [origem, setOrigem] = useState(() => mesAnterior(destino));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function copiar(event) {
    event.preventDefault();

    if (ocupadoRef.current || desabilitado) return;

    if (origem === destino) {
      setErro("Escolha um mês diferente do mês de destino.");
      return;
    }

    ocupadoRef.current = true;
    setSalvando(true);
    onOcupado(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch(`${API_URL}/orcamentos/copiar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origem: `${origem}-01`,
          destino: `${destino}-01`,
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

      setMensagem(
        `${corpo.copiados} limite(s) copiado(s). ` +
          `${corpo.ja_existentes} já existente(s). ` +
          `${corpo.categorias_indisponiveis} categoria(s) indisponível(is).`,
      );

      onCopiado();
    } catch (error) {
      setErro(
        error instanceof TypeError
          ? "Falha de conexão. Reabra Orçamentos para conferir o resultado antes de tentar novamente."
          : error.message,
      );
    } finally {
      ocupadoRef.current = false;
      setSalvando(false);
      onOcupado(false);
    }
  }

  return (
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
        disabled={desabilitado || salvando}
        aria-expanded={expandido}
        onClick={() => setExpandido((atual) => !atual)}
      >
        {expandido ? "Fechar cópia" : "Copiar limites de outro mês"}
      </button>

      {expandido && (
        <form onSubmit={copiar} style={{ marginTop: 16 }}>
          <label className="orcamentos-label">
            Copiar do mês
            <input
              type="month"
              value={origem}
              min="1900-01"
              max="9999-12"
              required
              disabled={desabilitado || salvando}
              onChange={(event) => {
                setOrigem(event.target.value);
                setErro("");
                setMensagem("");
              }}
            />
          </label>

          <p className="orcamentos-nota">
            Os limites serão copiados para{" "}
            <strong>{destino.split("-").reverse().join("/")}</strong>.
            Os limites que já existem nesse mês serão mantidos.
          </p>

          <div className="orcamentos-acoes" style={{ marginTop: 16 }}>
            <button
              type="submit"
              className="orcamentos-botao orcamentos-primario"
              disabled={desabilitado || salvando}
            >
              {salvando ? "Copiando..." : "Copiar limites"}
            </button>
          </div>
        </form>
      )}

      {erro && (
        <p className="orcamentos-aviso orcamentos-erro" role="alert">
          {erro}
        </p>
      )}

      {mensagem && (
        <p className="orcamentos-aviso orcamentos-sucesso" role="status">
          {mensagem}
        </p>
      )}
    </div>
  );
}