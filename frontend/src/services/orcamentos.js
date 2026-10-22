import { consultarApi } from "./api";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

async function enviar(caminho, metodo, dados) {
  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: dados
      ? { "Content-Type": "application/json" }
      : undefined,
    body: dados ? JSON.stringify(dados) : undefined,
  });

  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    const detalhe = corpo?.detail;

    if (typeof detalhe === "string") {
      throw new Error(detalhe);
    }

    if (Array.isArray(detalhe)) {
      throw new Error(detalhe.map((item) => item.msg).join(" · "));
    }

    throw new Error(
      `Não foi possível concluir. Código: ${resposta.status}.`,
    );
  }

  const resultado =
    resposta.status === 204 ? null : await resposta.json();

  window.dispatchEvent(new Event("orcamentos-atualizados"));

  return resultado;
}

export function listarOrcamentos(competencia, signal) {
  return consultarApi("/orcamentos", { competencia }, signal);
}

export function salvarOrcamento(dados) {
  return enviar("/orcamentos", "PUT", dados);
}

export function excluirOrcamento(id) {
  return enviar(`/orcamentos/${id}`, "DELETE");
}